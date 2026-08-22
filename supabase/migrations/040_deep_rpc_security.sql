-- ============================================================
-- PREMIAJÁ — Migration 040: Deep RPC Security Audit
-- ============================================================

-- 1. DROP THE INFINITE MONEY GLITCH
-- admin_add_user_balance is the safe one. We drop the unsafe one entirely.
DROP FUNCTION IF EXISTS public.add_user_balance(numeric);

-- 2. REVOKE PUBLIC EXECUTION FOR REWARDS AND XP
REVOKE EXECUTE ON FUNCTION public.add_user_reward(text, text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, numeric) FROM anon, authenticated;
-- Allow triggers and edge functions
GRANT EXECUTE ON FUNCTION public.add_user_reward(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_to_user(uuid, numeric) TO service_role;


-- 3. FIX: SECURE DRAW CAMPAIGN WINNER (Missing admin check)
CREATE OR REPLACE FUNCTION public.draw_campaign_winner(campaign_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
  v_prize public.prizes%ROWTYPE;
  v_winning_ticket public.tickets%ROWTYPE;
  v_total_entries integer;
  v_draw_id uuid;
BEGIN
  -- SEGURANÇA: Verificar Admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem sortear.';
  END IF;

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = campaign_uuid FOR UPDATE;
  IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF v_campaign.status != 'active' THEN RAISE EXCEPTION 'Campaign is not active'; END IF;

  SELECT * INTO v_prize FROM public.prizes WHERE campaign_id = campaign_uuid ORDER BY created_at ASC LIMIT 1;
  IF v_prize.id IS NULL THEN RAISE EXCEPTION 'No prizes configured for this campaign'; END IF;

  SELECT count(*) INTO v_total_entries FROM public.tickets WHERE campaign_id = campaign_uuid;
  IF v_total_entries = 0 THEN RAISE EXCEPTION 'No tickets sold for this campaign'; END IF;

  SELECT * INTO v_winning_ticket FROM public.tickets WHERE campaign_id = campaign_uuid ORDER BY random() LIMIT 1;

  INSERT INTO public.draws (
    campaign_id, prize_id, name, method, total_entries, status, winner_user_id, result_ticket_number, draw_date, drawn_at
  ) VALUES (
    campaign_uuid, v_prize.id, 'Sorteio Principal', 'random_db', v_total_entries, 'completed', v_winning_ticket.user_id, v_winning_ticket.ticket_number, NOW(), NOW()
  ) RETURNING id INTO v_draw_id;

  UPDATE public.campaigns SET status = 'finished', updated_at = NOW() WHERE id = campaign_uuid;

  INSERT INTO public.notifications (user_id, title, message, type) VALUES (
    v_winning_ticket.user_id, 'Você foi sorteado!', 'Parabéns! Você ganhou o prêmio principal do sorteio: ' || v_campaign.name || '. Verifique seus prêmios!', 'sorteio_winner'
  );

  RETURN jsonb_build_object('draw_id', v_draw_id, 'winner_user_id', v_winning_ticket.user_id, 'ticket_number', v_winning_ticket.ticket_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FIX: SECURE OPEN_BOX WITH FOR UPDATE (Race Condition Fix)
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
  -- SEGURANÇA: Adicionado FOR UPDATE para bloquear concorrência (evita multiplicador falso)
  SELECT * INTO v_user_box
  FROM public.user_boxes
  WHERE id = p_user_box_id
    AND status = 'available'
    AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box indisponível, já aberta ou não pertence ao usuário';
  END IF;

  SELECT COALESCE(SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.', email, 'Usuário') INTO v_display_name
  FROM public.profiles WHERE id = v_user_box.user_id;

  SELECT COALESCE(SUM(drop_chance), 0) INTO v_total_weight
  FROM public.prizes WHERE box_id = v_user_box.box_definition_id AND status = 'active';

  IF v_total_weight <= 0 THEN RAISE EXCEPTION 'Nenhum prêmio ativo nesta box.'; END IF;

  v_rand := random() * v_total_weight;

  FOR v_prize IN SELECT * FROM public.prizes WHERE box_id = v_user_box.box_definition_id AND status = 'active' ORDER BY drop_chance DESC
  LOOP
    v_cumulative := v_cumulative + v_prize.drop_chance;
    IF v_rand <= v_cumulative THEN EXIT; END IF;
  END LOOP;

  IF v_prize IS NULL THEN RAISE EXCEPTION 'Erro no sorteio.'; END IF;

  UPDATE public.user_boxes SET status = 'opened', result_prize_id = v_prize.id, opened_at = now() WHERE id = p_user_box_id;

  INSERT INTO public.winners (box_id, prize_id, user_id, source, display_name, won_at, is_public) 
  VALUES (v_user_box.box_definition_id, v_prize.id, v_user_box.user_id, 'box', v_display_name, now(), true) 
  RETURNING id INTO v_winner_id;

  IF v_prize.prize_type = 'double_spins' THEN
    UPDATE public.profiles
    SET double_free_spins_count = COALESCE(double_free_spins_count, 0) + COALESCE(v_prize.double_spins_count, 0),
        double_free_spins_value = COALESCE(v_prize.double_spins_value, double_free_spins_value, 0)
    WHERE id = v_user_box.user_id;
  ELSIF v_prize.reference_value IS NOT NULL AND v_prize.reference_value > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, status) VALUES (v_user_box.user_id, v_prize.reference_value, 'prize', 'completed');
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_prize.reference_value WHERE id = v_user_box.user_id;
  END IF;

  RETURN json_build_object('success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name, 'prize_image_url', v_prize.image_url, 'prize_value', v_prize.reference_value, 'prize_type', v_prize.prize_type);
END;
$$;


-- 5. SECURE SPIN DAILY WHEEL (Moves logic from frontend to backend)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily_spin timestamptz;

CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_deposit_count integer;
  v_profile record;
  v_config record;
  v_prizes jsonb;
  v_prize_count integer;
  v_random_index integer;
  v_selected_prize jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  -- 1. Check eligibility (Deposit in last 14 days)
  SELECT COUNT(*) INTO v_deposit_count 
  FROM public.payments 
  WHERE user_id = v_user_id 
    AND status = 'approved' 
    AND created_at >= NOW() - INTERVAL '14 days';

  IF v_deposit_count = 0 THEN
    RAISE EXCEPTION 'Você precisa ter feito pelo menos um depósito nos últimos 14 dias para girar a roleta.';
  END IF;

  -- 2. Lock profile and check cooldown
  SELECT * INTO v_profile 
  FROM public.profiles 
  WHERE id = v_user_id FOR UPDATE;

  IF v_profile.last_daily_spin IS NOT NULL AND v_profile.last_daily_spin > NOW() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Você já girou a roleta hoje. Volte em 24h!';
  END IF;

  -- 3. Get prizes config based on rank
  SELECT value INTO v_config 
  FROM public.system_settings 
  WHERE key = 'daily_wheel_prizes';

  IF v_config IS NULL THEN
    v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0}]'::jsonb;
  ELSE
    -- Try to get rank-specific array, fallback to default or first array found
    v_prizes := v_config->(COALESCE(v_profile.rank, 'P Starter'));
    IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
      -- Try P Starter as fallback
      v_prizes := v_config->'P Starter';
      IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
        v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0}]'::jsonb;
      END IF;
    END IF;
  END IF;

  -- 4. Pick random prize based on probability (or simple uniform if probabilities not set)
  -- For simplicity, we just pick uniform from the array, since frontend currently doesn't enforce strict weight logic in spin (it visually spins randomly among the sectors).
  -- Wait, the frontend wheel might just land on a random sector. Let's just pick a random index.
  v_prize_count := jsonb_array_length(v_prizes);
  v_random_index := floor(random() * v_prize_count);
  v_selected_prize := v_prizes->v_random_index;

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

  -- 6. Update cooldown
  UPDATE public.profiles 
  SET last_daily_spin = NOW() 
  WHERE id = v_user_id;

  -- 7. Return selected prize info so frontend can animate
  RETURN json_build_object(
    'success', true,
    'prize_index', v_random_index,
    'prize', v_selected_prize
  );
END;
$$;
