-- ============================================================
-- PREMIAJÁ — Migration 017: Buy Boxes with Wallet
-- ============================================================

-- 1. Update payment_method constraint in orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pix_manual', 'pix_gateway', 'card', 'wallet'));

-- 2. Create the RPC function
CREATE OR REPLACE FUNCTION public.buy_boxes_with_wallet(p_box_id uuid, p_quantity integer)
RETURNS uuid AS $$
DECLARE
  v_box record;
  v_user record;
  v_total_cost numeric;
  v_order_id uuid;
BEGIN
  -- Basic validations
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade deve ser maior que zero.';
  END IF;

  -- Get box info
  SELECT * INTO v_box FROM public.boxes WHERE id = p_box_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box não encontrada.';
  END IF;

  IF v_box.is_active = false THEN
    RAISE EXCEPTION 'Esta box não está ativa no momento.';
  END IF;

  -- Calculate total cost
  v_total_cost := v_box.price * p_quantity;

  -- Get user info and lock row for balance update
  SELECT * INTO v_user FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Check balance
  IF v_user.balance < v_total_cost THEN
    RAISE EXCEPTION 'Saldo insuficiente na carteira.';
  END IF;

  -- Deduct balance
  UPDATE public.profiles
  SET balance = balance - v_total_cost,
      updated_at = now()
  WHERE id = auth.uid();

  -- Log deduction transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (auth.uid(), -v_total_cost, 'withdrawal', 'completed');

  -- Create order
  INSERT INTO public.orders (box_id, user_id, quantity, unit_price, total_amount, status, payment_method, tickets_generated)
  VALUES (p_box_id, auth.uid(), p_quantity, v_box.price, v_total_cost, 'paid', 'wallet', true)
  RETURNING id INTO v_order_id;

  -- Create user_boxes
  FOR i IN 1..p_quantity LOOP
    INSERT INTO public.user_boxes (user_id, order_id, box_definition_id, status)
    VALUES (auth.uid(), v_order_id, p_box_id, 'available');
  END LOOP;

  -- Log action
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(), 
    'BOX_PURCHASED_WALLET', 
    'orders', 
    v_order_id, 
    jsonb_build_object('box_id', p_box_id, 'quantity', p_quantity, 'total_cost', v_total_cost)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
