-- ============================================================
-- PREMIAJÁ — Migration 038: Security Audit Fixes
-- ============================================================

-- 1. FIX PROFILES RLS: Prevent users from updating sensitive columns
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow admins to do whatever they want
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- For normal users updating their own profile
  IF auth.uid() = NEW.id THEN
    IF OLD.balance IS DISTINCT FROM NEW.balance THEN
      RAISE EXCEPTION 'Not allowed to update balance directly. Use wallet endpoints.';
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Not allowed to update role.';
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Not allowed to update status.';
    END IF;
    IF OLD.xp IS DISTINCT FROM NEW.xp THEN
      RAISE EXCEPTION 'Not allowed to update xp.';
    END IF;
    IF OLD.level IS DISTINCT FROM NEW.level THEN
      RAISE EXCEPTION 'Not allowed to update level.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_profile_updates ON public.profiles;
CREATE TRIGGER tr_check_profile_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_updates();


-- 2. FIX ORDERS RLS: Disable direct inserts by users
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;

-- We replace it with a policy that only allows insert if the user is an admin,
-- or if the insert is happening through a SECURITY DEFINER function (which bypasses RLS anyway).
CREATE POLICY "orders_insert_admin_only" ON public.orders
  FOR INSERT WITH CHECK (public.is_admin());


-- 3. CREATE SECURE PURCHASE RPC
CREATE OR REPLACE FUNCTION public.buy_campaign_tickets_with_wallet(p_campaign_id uuid, p_quantity integer)
RETURNS uuid AS $$
DECLARE
  v_campaign record;
  v_user record;
  v_total_cost numeric;
  v_order_id uuid;
BEGIN
  -- Basic validations
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
  END IF;

  -- Get campaign info
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campanha não encontrada.';
  END IF;

  IF v_campaign.status != 'active' THEN
    RAISE EXCEPTION 'Esta campanha não está ativa no momento.';
  END IF;

  -- Calculate total cost
  v_total_cost := v_campaign.ticket_price * p_quantity;

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

  -- Log deduction transaction (optional, but good practice for wallet ledger)
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (auth.uid(), -v_total_cost, 'withdrawal', 'completed');

  -- Create order (Bypasses RLS because this function is SECURITY DEFINER)
  INSERT INTO public.orders (
    user_id, 
    campaign_id, 
    quantity, 
    unit_price, 
    total_amount, 
    status, 
    payment_method, 
    tickets_generated
  )
  VALUES (
    auth.uid(), 
    p_campaign_id, 
    p_quantity, 
    v_campaign.ticket_price, 
    v_total_cost, 
    'paid', 
    'wallet', 
    false
  )
  RETURNING id INTO v_order_id;

  -- Generate Tickets for Order
  PERFORM public.generate_tickets_for_order(v_order_id);

  -- Log action
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(), 
    'CAMPAIGN_TICKETS_PURCHASED_WALLET', 
    'orders', 
    v_order_id, 
    jsonb_build_object('campaign_id', p_campaign_id, 'quantity', p_quantity, 'total_cost', v_total_cost)
  );

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
