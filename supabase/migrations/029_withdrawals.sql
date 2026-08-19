-- ============================================================
-- PREMIAJÁ — Migration 029: Withdrawals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id),
  amount         numeric(10,2) NOT NULL,
  pix_key        text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes    text,
  processed_by   uuid REFERENCES public.profiles(id),
  processed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawals_user_idx ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON public.withdrawals(status);

-- RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_select_own" ON public.withdrawals
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "withdrawals_admin_all" ON public.withdrawals
  FOR ALL USING (public.is_admin());

-- RPCs
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_pix_key text)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_withdrawal_id uuid;
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

  -- Lock profile row for update to prevent race conditions
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


CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id uuid)
RETURNS void AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT status INTO v_status FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Saque não encontrado.';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Este saque já foi processado (%).', v_status;
  END IF;

  UPDATE public.withdrawals
  SET status = 'approved',
      processed_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_withdrawal_id uuid, p_reason text)
RETURNS void AS $$
DECLARE
  v_status text;
  v_amount numeric;
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  IF length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'É obrigatório informar o motivo da recusa.';
  END IF;

  SELECT status, amount, user_id INTO v_status, v_amount, v_user_id 
  FROM public.withdrawals 
  WHERE id = p_withdrawal_id 
  FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Saque não encontrado.';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Este saque já foi processado (%).', v_status;
  END IF;

  -- Restore balance
  UPDATE public.profiles
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE id = v_user_id;

  -- Update withdrawal
  UPDATE public.withdrawals
  SET status = 'rejected',
      admin_notes = p_reason,
      processed_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
