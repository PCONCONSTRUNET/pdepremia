-- ============================================================
-- PREMIAJÁ — Migration 042: Final Security Fixes (Audit)
-- ============================================================

-- 1. FIX: SECURE OPEN_BOX WITH FOR UPDATE AND WEIGHTED AVERAGE FREE SPINS
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
  -- SEGURANÇA: Bloqueio para evitar race condition
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
    -- SEGURANÇA: Média Ponderada para giros grátis para não gerar valor falso
    UPDATE public.profiles
    SET 
        double_free_spins_value = CASE 
          WHEN (COALESCE(double_free_spins_count, 0) + COALESCE(v_prize.double_spins_count, 0)) = 0 THEN 0
          ELSE (COALESCE(double_free_spins_count, 0) * COALESCE(double_free_spins_value, 0) + COALESCE(v_prize.double_spins_count, 0) * COALESCE(v_prize.double_spins_value, 0)) / (COALESCE(double_free_spins_count, 0) + COALESCE(v_prize.double_spins_count, 0))
        END,
        double_free_spins_count = COALESCE(double_free_spins_count, 0) + COALESCE(v_prize.double_spins_count, 0)
    WHERE id = v_user_box.user_id;
  ELSIF v_prize.reference_value IS NOT NULL AND v_prize.reference_value > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, status) VALUES (v_user_box.user_id, v_prize.reference_value, 'prize', 'completed');
    UPDATE public.profiles SET balance = COALESCE(balance, 0) + v_prize.reference_value WHERE id = v_user_box.user_id;
  END IF;

  RETURN json_build_object('success', true, 'prize_id', v_prize.id, 'prize_name', v_prize.name, 'prize_image_url', v_prize.image_url, 'prize_value', v_prize.reference_value, 'prize_type', v_prize.prize_type);
END;
$$;


-- 2. FIX: LIMIT QUANTITY ON BOX PURCHASES (DoS PREVENTION)
CREATE OR REPLACE FUNCTION public.buy_boxes_with_wallet(p_box_id uuid, p_quantity integer)
RETURNS uuid AS $$
DECLARE
  v_box record;
  v_user record;
  v_total_cost numeric;
  v_order_id uuid;
BEGIN
  -- SEGURANÇA: Limites estritos de quantidade (Anti-DoS)
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero.';
  END IF;

  IF p_quantity > 100 THEN
    RAISE EXCEPTION 'A quantidade máxima permitida por vez é 100 caixas.';
  END IF;

  SELECT * INTO v_box FROM public.boxes WHERE id = p_box_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Box não encontrada.'; END IF;
  IF v_box.is_active = false THEN RAISE EXCEPTION 'Esta box não está ativa no momento.'; END IF;

  v_total_cost := v_box.price * p_quantity;

  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Saldo insuficiente na carteira.'; END IF;

  UPDATE public.profiles SET balance = balance - v_total_cost, updated_at = now() WHERE id = auth.uid();

  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (auth.uid(), -v_total_cost, 'withdrawal', 'completed');

  INSERT INTO public.orders (box_id, user_id, quantity, unit_price, total_amount, status, payment_method, tickets_generated)
  VALUES (p_box_id, auth.uid(), p_quantity, v_box.price, v_total_cost, 'paid', 'wallet', true)
  RETURNING id INTO v_order_id;

  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.user_boxes (user_id, order_id, box_definition_id, status)
    VALUES (auth.uid(), v_order_id, p_box_id, 'available');
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (auth.uid(), 'BOX_PURCHASED_WALLET', 'orders', v_order_id, jsonb_build_object('box_id', p_box_id, 'quantity', p_quantity, 'total_cost', v_total_cost));

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FIX: LIMIT QUANTITY ON TICKET PURCHASES (DoS PREVENTION)
CREATE OR REPLACE FUNCTION public.buy_campaign_tickets_with_wallet(p_campaign_id uuid, p_quantity integer)
RETURNS uuid AS $$
DECLARE
  v_campaign record;
  v_user record;
  v_total_cost numeric;
  v_order_id uuid;
BEGIN
  -- SEGURANÇA: Limites estritos de quantidade (Anti-DoS)
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  IF p_quantity > 2000 THEN
    RAISE EXCEPTION 'A quantidade máxima permitida por vez é 2000 bilhetes.';
  END IF;

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não encontrada.'; END IF;
  IF v_campaign.status != 'active' THEN RAISE EXCEPTION 'Esta campanha não está ativa no momento.'; END IF;

  v_total_cost := v_campaign.ticket_price * p_quantity;

  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado.'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Saldo insuficiente na carteira.'; END IF;

  UPDATE public.profiles SET balance = balance - v_total_cost, updated_at = now() WHERE id = auth.uid();

  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (auth.uid(), -v_total_cost, 'withdrawal', 'completed');

  INSERT INTO public.orders (user_id, campaign_id, quantity, unit_price, total_amount, status, payment_method, tickets_generated)
  VALUES (auth.uid(), p_campaign_id, p_quantity, v_campaign.ticket_price, v_total_cost, 'paid', 'wallet', false)
  RETURNING id INTO v_order_id;

  PERFORM public.generate_tickets_for_order(v_order_id);

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (auth.uid(), 'CAMPAIGN_TICKETS_PURCHASED_WALLET', 'orders', v_order_id, jsonb_build_object('campaign_id', p_campaign_id, 'quantity', p_quantity, 'total_cost', v_total_cost));

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. FIX: BACKEND COOLDOWN FOR WITHDRAWALS
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_pix_key text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_withdrawal_id uuid;
  v_last_withdrawal_time timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do saque deve ser maior que zero.';
  END IF;

  IF length(trim(p_pix_key)) = 0 THEN
    RAISE EXCEPTION 'Chave PIX inválida.';
  END IF;
  
  -- SEGURANÇA: Verificação de Cooldown (5 minutos)
  SELECT created_at INTO v_last_withdrawal_time 
  FROM public.withdrawals 
  WHERE user_id = v_user_id 
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_last_withdrawal_time IS NOT NULL AND v_last_withdrawal_time > NOW() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Aguarde 5 minutos entre cada solicitação de saque.';
  END IF;

  -- Lock profile row
  SELECT balance INTO v_balance 
  FROM public.profiles 
  WHERE id = v_user_id 
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente.';
  END IF;

  -- Deduct balance
  UPDATE public.profiles
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = v_user_id;

  -- Insert withdrawal
  INSERT INTO public.withdrawals (user_id, amount, pix_key, status)
  VALUES (v_user_id, p_amount, trim(p_pix_key), 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
