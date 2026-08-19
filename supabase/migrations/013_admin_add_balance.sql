-- ============================================================
-- PREMIAJÁ — Migration 013: Admin Add Balance RPC
-- ============================================================

-- Update wallet_transactions type constraint to allow 'admin_bonus'
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'admin_bonus', 'promo_code'));

CREATE OR REPLACE FUNCTION public.admin_add_user_balance(target_user_id uuid, amount numeric)
RETURNS void AS $$
DECLARE
  caller_role text;
  target_user_name text;
BEGIN
  -- Verify caller is admin
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem adicionar saldo a outros usuários.';
  END IF;

  IF amount <= 0 THEN
    RAISE EXCEPTION 'O valor a ser adicionado deve ser maior que zero.';
  END IF;

  -- Get target user name for audit logs
  SELECT full_name INTO target_user_name FROM public.profiles WHERE id = target_user_id;

  UPDATE public.profiles
  SET balance = balance + amount,
      updated_at = now()
  WHERE id = target_user_id;

  -- Log action
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(), 
    'ADMIN_ADDED_BALANCE', 
    'profiles', 
    target_user_id, 
    jsonb_build_object('amount', amount, 'target_user_name', target_user_name)
  );

  -- Insert wallet transaction so user can see it
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (target_user_id, amount, 'admin_bonus', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
