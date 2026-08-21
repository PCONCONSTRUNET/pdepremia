-- 1. Add columns to profiles for free spins
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS double_free_spins_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS double_free_spins_value numeric(10,2) DEFAULT 0.00;

-- 2. Modify prizes constraints and add columns
ALTER TABLE public.prizes DROP CONSTRAINT IF EXISTS prizes_prize_type_check;
ALTER TABLE public.prizes ADD CONSTRAINT prizes_prize_type_check 
  CHECK (prize_type IN ('instant', 'draw', 'box', 'wheel', 'coupon', 'product', 'benefit', 'double_spins'));

ALTER TABLE public.prizes 
  ADD COLUMN IF NOT EXISTS double_spins_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS double_spins_value numeric(10,2) DEFAULT 0.00;

-- 3. Update open_box RPC to handle double_spins
CREATE OR REPLACE FUNCTION public.open_box(p_user_box_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_box     record;
  v_prize        record;
  v_winner_id    uuid;
  v_display_name text;
  v_total_weight numeric;
  v_rand         numeric;
  v_cumulative   numeric := 0;
BEGIN
  -- 1. Verificar se a box pertence ao usuário logado e está disponível
  SELECT * INTO v_user_box
  FROM public.user_boxes
  WHERE id = p_user_box_id
    AND status = 'available'
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box indisponível, já aberta ou não pertence ao usuário';
  END IF;

  -- 2. Buscar nome do usuário para display_name
  SELECT COALESCE(
    SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.',
    email,
    'Usuário'
  ) INTO v_display_name
  FROM public.profiles
  WHERE id = v_user_box.user_id;

  -- 3. Sorteio ponderado por drop_chance
  SELECT COALESCE(SUM(drop_chance), 0) INTO v_total_weight
  FROM public.prizes
  WHERE box_id = v_user_box.box_definition_id
    AND status = 'active';

  IF v_total_weight <= 0 THEN
    RAISE EXCEPTION 'Nenhum prêmio ativo nesta box. Contate o administrador.';
  END IF;

  v_rand := random() * v_total_weight;

  FOR v_prize IN
    SELECT *
    FROM public.prizes
    WHERE box_id = v_user_box.box_definition_id
      AND status = 'active'
    ORDER BY drop_chance DESC
  LOOP
    v_cumulative := v_cumulative + v_prize.drop_chance;
    IF v_rand <= v_cumulative THEN
      EXIT; -- v_prize é o vencedor
    END IF;
  END LOOP;

  IF v_prize IS NULL THEN
    RAISE EXCEPTION 'Erro no sorteio. Contate o administrador.';
  END IF;

  -- 4. Atualizar status da box do usuário
  UPDATE public.user_boxes
  SET status = 'opened',
      result_prize_id = v_prize.id,
      opened_at = now()
  WHERE id = p_user_box_id;

  -- 5. Registrar o vencedor
  INSERT INTO public.winners (
    box_id,
    prize_id,
    user_id,
    source,
    display_name,
    won_at,
    is_public
  ) VALUES (
    v_user_box.box_definition_id,
    v_prize.id,
    v_user_box.user_id,
    'box',
    v_display_name,
    now(),
    true
  ) RETURNING id INTO v_winner_id;

  -- 6. Processar a premiação
  IF v_prize.prize_type = 'double_spins' THEN
    -- Acumula a quantidade de giros e substitui/mantém o valor mais alto ou mais recente
    UPDATE public.profiles
    SET double_free_spins_count = COALESCE(double_free_spins_count, 0) + COALESCE(v_prize.double_spins_count, 0),
        double_free_spins_value = COALESCE(v_prize.double_spins_value, double_free_spins_value, 0)
    WHERE id = v_user_box.user_id;
  ELSIF v_prize.reference_value IS NOT NULL AND v_prize.reference_value > 0 THEN
    -- Prêmio normal em dinheiro
    INSERT INTO public.wallet_transactions (user_id, amount, type, status)
    VALUES (
      v_user_box.user_id,
      v_prize.reference_value,
      'prize',
      'completed'
    );

    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_prize.reference_value
    WHERE id = v_user_box.user_id;
  END IF;

  RETURN json_build_object(
    'success',         true,
    'prize_id',        v_prize.id,
    'prize_name',      v_prize.name,
    'prize_image_url', v_prize.image_url,
    'prize_value',     v_prize.reference_value,
    'prize_type',      v_prize.prize_type
  );
END;
$$;


-- 4. Update place_double_bet RPC to handle free spins
DROP FUNCTION IF EXISTS public.place_double_bet(numeric, text);
CREATE OR REPLACE FUNCTION public.place_double_bet(p_bet_amount numeric, p_target_color text, p_use_free_spin boolean DEFAULT false)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_free_spins_count int;
  v_free_spins_value numeric;
  v_unix_time numeric;
  v_round_id bigint;
  v_phase_time int;
  v_actual_bet_amount numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_target_color NOT IN ('red', 'black', 'white') THEN RAISE EXCEPTION 'Invalid target color'; END IF;

  v_unix_time := extract(epoch from now());
  v_round_id := floor(v_unix_time / 19);
  v_phase_time := mod(v_unix_time::int, 19);

  IF v_phase_time >= 15 THEN
    RAISE EXCEPTION 'Apostas encerradas para esta rodada. Aguarde o próximo sorteio.';
  END IF;

  -- Lock and check profile
  SELECT balance, COALESCE(double_free_spins_count, 0), COALESCE(double_free_spins_value, 0)
  INTO v_balance, v_free_spins_count, v_free_spins_value
  FROM public.profiles 
  WHERE id = v_user_id FOR UPDATE;

  IF p_use_free_spin THEN
    IF v_free_spins_count <= 0 THEN
      RAISE EXCEPTION 'Você não possui giros grátis disponíveis.';
    END IF;
    -- Força o valor da aposta para ser exatamente o valor do giro grátis
    v_actual_bet_amount := v_free_spins_value;
    
    -- Deduz 1 giro grátis
    UPDATE public.profiles SET double_free_spins_count = double_free_spins_count - 1 WHERE id = v_user_id;
  ELSE
    IF p_bet_amount <= 0 THEN RAISE EXCEPTION 'Bet amount must be greater than zero'; END IF;
    IF v_balance < p_bet_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    
    v_actual_bet_amount := p_bet_amount;
    
    -- Deduct bet amount
    UPDATE public.profiles SET balance = balance - v_actual_bet_amount WHERE id = v_user_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type, status) 
    VALUES (v_user_id, -v_actual_bet_amount, 'bet', 'completed');
  END IF;

  -- Record the bet
  INSERT INTO public.double_bets (user_id, round_id, amount, color, status)
  VALUES (v_user_id, v_round_id, v_actual_bet_amount, p_target_color, 'pending');

  -- Get new profile data
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'round_id', v_round_id,
    'new_balance', v_balance,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
