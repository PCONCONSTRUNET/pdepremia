-- ─── Migration 028: drop_chance para prêmios de Box ──────────────────────────
--
-- Adiciona campo drop_chance (numeric 0–100) na tabela prizes.
-- A função open_box usa sorteio ponderado: prêmios raros têm drop_chance baixo,
-- comuns têm drop_chance alto. A soma não precisa ser exatamente 100.
--
-- Exemplos de configuração:
--   "Tente Novamente" → drop_chance = 50 (50% de chance)
--   "5 Reais"         → drop_chance = 25
--   "10 Reais"        → drop_chance = 15
--   "20 Reais"        → drop_chance = 7
--   "50 Reais"        → drop_chance = 3

-- 1. Adiciona a coluna (default 10 para não quebrar prêmios existentes)
ALTER TABLE public.prizes
  ADD COLUMN IF NOT EXISTS drop_chance numeric(6,2) NOT NULL DEFAULT 10.0;

-- 2. Atualiza a função open_box para usar sorteio ponderado
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
  --    Calcula o peso total de todos os prêmios ativos desta box
  SELECT COALESCE(SUM(drop_chance), 0) INTO v_total_weight
  FROM public.prizes
  WHERE box_id = v_user_box.box_definition_id
    AND status = 'active';

  IF v_total_weight <= 0 THEN
    RAISE EXCEPTION 'Nenhum prêmio ativo nesta box. Contate o administrador.';
  END IF;

  -- Sorteia um número aleatório entre 0 e o peso total
  v_rand := random() * v_total_weight;

  -- Percorre os prêmios em ordem de drop_chance decrescente (mais comum primeiro)
  -- e seleciona aquele cujo acumulado ultrapassa v_rand
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

  -- 5. Registrar o vencedor na tabela de ganhadores
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

  -- 6. Se o prêmio tiver valor monetário, creditar na carteira do usuário
  IF v_prize.reference_value IS NOT NULL AND v_prize.reference_value > 0 THEN
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
    'prize_value',     v_prize.reference_value
  );
END;
$$;
