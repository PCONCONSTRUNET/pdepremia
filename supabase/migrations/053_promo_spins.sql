-- Adiciona a coluna available_promo_spins à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_promo_spins integer DEFAULT 0;

-- Atualiza a constraint de tipos de recompensa válidos
ALTER TABLE public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_reward_type_check;
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_reward_type_check 
CHECK (reward_type = ANY (ARRAY['xp_multiplier'::text, 'roulette'::text, 'daily_spin'::text, 'box'::text, 'cashback'::text, 'balance'::text]));

-- Atualiza a função redeem_promo_code para reconhecer 'daily_spin'
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_promo record;
    v_already_redeemed boolean;
BEGIN
    -- 1. Find the active promo code
    SELECT * INTO v_promo 
    FROM promo_codes 
    WHERE upper(code) = upper(p_code) AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Código inválido ou inativo.');
    END IF;

    -- 2. Check expiration
    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este código promocional já expirou.');
    END IF;

    -- 3. Check use limit
    IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'O limite de uso deste código já foi atingido.');
    END IF;

    -- 4. Check if user already redeemed
    SELECT EXISTS (
        SELECT 1 FROM promo_code_redemptions 
        WHERE promo_code_id = v_promo.id AND user_id = p_user_id
    ) INTO v_already_redeemed;

    IF v_already_redeemed THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você já resgatou este código promocional.');
    END IF;

    -- 5. Apply the reward
    IF v_promo.reward_type = 'balance' THEN
        UPDATE profiles SET balance = balance + v_promo.reward_amount WHERE id = p_user_id;
        
        INSERT INTO wallet_transactions (user_id, amount, type, status, description)
        VALUES (p_user_id, v_promo.reward_amount, 'deposit', 'completed', 'Resgate de Código Promocional: ' || v_promo.code);
        
    ELSIF v_promo.reward_type = 'xp_multiplier' THEN
        UPDATE profiles 
        SET xp_multiplier = v_promo.reward_amount,
            xp_multiplier_expires_at = now() + (v_promo.reward_duration || ' seconds')::interval
        WHERE id = p_user_id;
        
    ELSIF v_promo.reward_type = 'cashback' THEN
        UPDATE profiles 
        SET cashback_percentage = v_promo.reward_amount,
            cashback_expires_at = now() + (v_promo.reward_duration || ' seconds')::interval
        WHERE id = p_user_id;
        
    ELSIF v_promo.reward_type = 'box' THEN
        -- Give a free box by inserting into user_boxes
        INSERT INTO user_boxes (user_id, box_definition_id, status)
        VALUES (p_user_id, v_promo.reward_reference_id, 'available');
    
    ELSIF v_promo.reward_type = 'daily_spin' THEN
        UPDATE profiles SET available_promo_spins = COALESCE(available_promo_spins, 0) + v_promo.reward_amount WHERE id = p_user_id;
    END IF;

    -- 6. Register redemption and update uses
    INSERT INTO promo_code_redemptions (promo_code_id, user_id) VALUES (v_promo.id, p_user_id);
    
    UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

    RETURN jsonb_build_object(
        'success', true, 
        'reward_type', v_promo.reward_type,
        'reward_amount', v_promo.reward_amount,
        'message', 'Código resgatado com sucesso!'
    );
END;
$function$;

-- Atualiza spin_daily_wheel
CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_deposit_count integer;
  v_profile record;
  v_config jsonb;
  v_prizes jsonb;
  v_prize_count integer;
  v_random_index integer;
  v_selected_prize jsonb;
  v_total_weight numeric := 0;
  v_rand numeric;
  v_cumulative numeric := 0;
  v_i integer;
  v_prize jsonb;
  v_using_promo_spin boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- Bloqueia o perfil para leitura/edição
  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = v_user_id FOR UPDATE;

  -- 1. Verifica se tem giro promocional
  IF v_profile.available_promo_spins > 0 THEN
      v_using_promo_spin := true;
  ELSE
      -- 1. Check eligibility (Deposit in last 14 days)
      SELECT COUNT(*) INTO v_deposit_count 
      FROM public.payments 
      WHERE user_id = v_user_id 
        AND status = 'approved' 
        AND created_at >= NOW() - INTERVAL '14 days';

      IF v_deposit_count = 0 THEN
        RAISE EXCEPTION 'Você precisa ter feito pelo menos um depósito nos últimos 14 dias para girar a roleta.';
      END IF;

      -- 2. Check cooldown
      IF v_profile.last_daily_spin IS NOT NULL AND v_profile.last_daily_spin > NOW() - INTERVAL '24 hours' THEN
        RAISE EXCEPTION 'Você já girou a roleta hoje. Volte em 24h!';
      END IF;
  END IF;

  -- 3. Get prizes config based on rank
  SELECT value INTO v_config 
  FROM public.system_settings 
  WHERE key = 'daily_wheel_prizes';

  IF v_config IS NULL THEN
    v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0, "probability": 100}]'::jsonb;
  ELSE
    -- Try to get rank-specific array, fallback to default or first array found
    v_prizes := v_config->(COALESCE(v_profile.rank, 'P Starter'));
    IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
      -- Try P Starter as fallback
      v_prizes := v_config->'P Starter';
      IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
        v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0, "probability": 100}]'::jsonb;
      END IF;
    END IF;
  END IF;

  -- 4. Pick random prize based on strict probability weights
  v_prize_count := jsonb_array_length(v_prizes);
  
  -- Calcular soma total das probabilidades
  FOR v_i IN 0 .. v_prize_count - 1 LOOP
    v_prize := v_prizes->v_i;
    v_total_weight := v_total_weight + COALESCE((v_prize->>'probability')::numeric, 0);
  END LOOP;

  IF v_total_weight <= 0 THEN
    -- Fallback to first prize if all weights are 0
    v_random_index := 0;
    v_selected_prize := v_prizes->0;
  ELSE
    v_rand := random() * v_total_weight;
    
    FOR v_i IN 0 .. v_prize_count - 1 LOOP
      v_prize := v_prizes->v_i;
      v_cumulative := v_cumulative + COALESCE((v_prize->>'probability')::numeric, 0);
      IF v_rand <= v_cumulative THEN
        v_random_index := v_i;
        v_selected_prize := v_prize;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  -- Prevenção de segurança extra
  IF v_selected_prize IS NULL THEN
      v_random_index := 0;
      v_selected_prize := v_prizes->0;
  END IF;

  -- 5. Process Reward
  IF (v_selected_prize->>'type') = 'balance' AND (v_selected_prize->>'value')::numeric > 0 THEN
    -- Add balance
    UPDATE public.profiles 
    SET balance = balance + (v_selected_prize->>'value')::numeric 
    WHERE id = v_user_id;
    
    INSERT INTO public.wallet_transactions (user_id, amount, type, status) 
    VALUES (v_user_id, (v_selected_prize->>'value')::numeric, 'prize', 'completed');
  ELSIF (v_selected_prize->>'type') != 'empty' THEN
    -- Add virtual reward
    INSERT INTO public.user_rewards (user_id, name, category, image_url, source)
    VALUES (v_user_id, v_selected_prize->>'name', COALESCE(v_selected_prize->>'category', 'Geral'), v_selected_prize->>'imageUrl', 'daily_wheel');
  END IF;

  -- 6. Update cooldown and available spins
  IF v_using_promo_spin THEN
      UPDATE public.profiles 
      SET available_promo_spins = available_promo_spins - 1
      WHERE id = v_user_id;
  ELSE
      UPDATE public.profiles 
      SET last_daily_spin = NOW() 
      WHERE id = v_user_id;
  END IF;

  -- 7. Return selected prize info so frontend can animate
  RETURN json_build_object(
    'success', true,
    'prize_index', v_random_index,
    'prize', v_selected_prize
  );
END;
$$;
