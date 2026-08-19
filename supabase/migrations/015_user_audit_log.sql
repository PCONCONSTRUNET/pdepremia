-- ============================================================
-- PREMIAJÁ — Migration 015: User Audit Log Function & Fixes
-- ============================================================

-- 1. Update `add_user_balance` to ALSO insert a `wallet_transaction`
-- This ensures that balance additions (e.g., from Daily Wheel) appear in 
-- both the User's Wallet History and the Admin's Audit Log.
CREATE OR REPLACE FUNCTION public.add_user_balance(amount numeric)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only allow adding positive amounts
  IF amount <= 0 THEN
    RAISE EXCEPTION 'O valor a ser adicionado deve ser maior que zero.';
  END IF;

  -- Update Balance
  UPDATE public.profiles
  SET balance = balance + amount,
      updated_at = now()
  WHERE id = v_user_id;

  -- Insert wallet transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (v_user_id, amount, 'bonus', 'completed');
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create `get_user_audit_log`
-- This function unifies data from wallet_transactions, user_rewards, winners, and user_boxes
-- into a single timeline for the Admin's "Auditoria do Cliente" modal.
CREATE OR REPLACE FUNCTION public.get_user_audit_log(p_user_id uuid)
RETURNS TABLE (
  log_id uuid,
  event_type text,
  action_type text,
  amount numeric,
  details jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  
  -- 1. Wallet Transactions (includes Daily Wheel balance winnings and manual admin additions)
  SELECT 
    wt.id as log_id,
    'transaction'::text as event_type,
    wt.type as action_type,
    wt.amount as amount,
    jsonb_build_object(
      'description', 
      CASE 
        WHEN wt.type = 'bonus' THEN 'Ganho na Roleta Diária'
        WHEN wt.type = 'admin_bonus' THEN 'Bônus Administrativo'
        WHEN wt.type = 'deposit' THEN 'Depósito'
        WHEN wt.type = 'withdrawal' THEN 'Saque'
        ELSE 'Transação'
      END
    ) as details,
    wt.created_at as created_at
  FROM public.wallet_transactions wt
  WHERE wt.user_id = p_user_id

  UNION ALL

  -- 2. Physical/Bonus Rewards won (e.g. XP Duplo, Cashback 5%) from Daily Wheel
  SELECT 
    ur.id as log_id,
    'prize_won'::text as event_type,
    'reward'::text as action_type,
    0::numeric as amount,
    jsonb_build_object('prize_name', ur.name, 'ticket', 'Roleta Diária') as details,
    ur.created_at as created_at
  FROM public.user_rewards ur
  WHERE ur.user_id = p_user_id

  UNION ALL

  -- 3. Campaign Winners (Instant Prizes, Draws, Boxes)
  SELECT 
    w.id as log_id,
    'prize_won'::text as event_type,
    w.source as action_type,
    0::numeric as amount,
    jsonb_build_object('prize_name', p.name, 'ticket', COALESCE(w.display_ticket, 'Sorteio/Prêmio Direto')) as details,
    w.created_at as created_at
  FROM public.winners w
  JOIN public.prizes p ON w.prize_id = p.id
  WHERE w.user_id = p_user_id

  UNION ALL

  -- 4. User Boxes Opened
  SELECT 
    ub.id as log_id,
    'box_opened'::text as event_type,
    'box'::text as action_type,
    0::numeric as amount,
    jsonb_build_object('box_name', b.name, 'result_prize', COALESCE(p.name, 'Nenhum prêmio ganho')) as details,
    ub.created_at as created_at
  FROM public.user_boxes ub
  JOIN public.boxes b ON ub.box_definition_id = b.id
  LEFT JOIN public.prizes p ON ub.result_prize_id = p.id
  WHERE ub.user_id = p_user_id AND ub.status = 'opened'

  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
