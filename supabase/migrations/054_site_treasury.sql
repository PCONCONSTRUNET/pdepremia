-- ============================================================
-- PREMIAJÁ — Migration 054: Caixa do Sistema (Treasury)
-- ============================================================

-- Tabela que guarda o saldo consolidado do caixa (sempre 1 linha)
CREATE TABLE IF NOT EXISTS public.site_treasury (
    id integer PRIMARY KEY DEFAULT 1,
    balance numeric(15,2) NOT NULL DEFAULT 0,
    CONSTRAINT site_treasury_single_row CHECK (id = 1)
);

-- Insere a linha inicial se não existir
INSERT INTO public.site_treasury (id, balance) 
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Tabela de logs do caixa (histórico de transações)
CREATE TABLE IF NOT EXISTS public.site_treasury_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'manual_add', 'manual_remove')),
    amount numeric(15,2) NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id)
);

-- RLS
ALTER TABLE public.site_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_treasury_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_treasury_admin_all" ON public.site_treasury
  FOR ALL USING (public.is_admin());

CREATE POLICY "site_treasury_logs_admin_all" ON public.site_treasury_logs
  FOR ALL USING (public.is_admin());

-- ============================================================
-- FUNÇÕES
-- ============================================================

-- Função para registrar entrada ou saída no caixa (usada internamente e pelo Admin)
CREATE OR REPLACE FUNCTION public.update_site_treasury(p_amount numeric, p_type text, p_description text, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_amount <= 0 THEN
      RAISE EXCEPTION 'Valor deve ser maior que zero.';
    END IF;

    -- Atualiza saldo
    IF p_type IN ('deposit', 'manual_add') THEN
        UPDATE public.site_treasury SET balance = balance + p_amount WHERE id = 1;
    ELSIF p_type IN ('withdrawal', 'manual_remove') THEN
        UPDATE public.site_treasury SET balance = balance - p_amount WHERE id = 1;
    ELSE
        RAISE EXCEPTION 'Tipo de transação de caixa inválido: %', p_type;
    END IF;

    -- Registra o log
    INSERT INTO public.site_treasury_logs (type, amount, description, created_by)
    VALUES (p_type, p_amount, p_description, p_user_id);
END;
$$;


-- Atualiza a função process_payment_webhook para adicionar o depósito no caixa
CREATE OR REPLACE FUNCTION public.process_payment_webhook(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- 1. Obter pedido e travar a linha para leitura (evita race condition)
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado (ID: %).', p_order_id;
  END IF;

  -- 2. Se já estiver pago, ignora com sucesso (idempotência)
  IF v_order.status = 'paid' THEN
    RETURN TRUE;
  END IF;

  -- 3. Atualizar status do pedido para pago
  UPDATE public.orders 
  SET status = 'paid' 
  WHERE id = p_order_id;

  -- 4. Atualizar pagamento relacionado se existir
  UPDATE public.payments 
  SET status = 'confirmed', confirmed_at = now() 
  WHERE order_id = p_order_id;

  -- 5. Lógica de Negócio: Depositar Saldo na Carteira
  -- Se o pedido não tiver campanha nem caixa, significa que é um Depósito Direto na Carteira
  IF v_order.campaign_id IS NULL AND v_order.box_id IS NULL THEN
    UPDATE public.profiles 
    SET balance = balance + v_order.total_amount 
    WHERE id = v_order.user_id;
  END IF;

  -- 6. CAIXA (Tesouraria): Somar entrada
  -- Qualquer depósito pago via webhook significa dinheiro entrando fisicamente na MisticPay.
  PERFORM public.update_site_treasury(v_order.total_amount, 'deposit', 'Depósito automático (Pedido: ' || v_order.id || ')', v_order.user_id);

  RETURN TRUE;
END;
$$;


-- Atualiza a função approve_withdrawal para remover o saldo do caixa
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_amount numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  SELECT status, amount INTO v_status, v_amount FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Saque não encontrado.';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Este saque já foi processado (%).', v_status;
  END IF;

  -- Atualiza o saque para aprovado
  UPDATE public.withdrawals
  SET status = 'approved',
      processed_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  WHERE id = p_withdrawal_id;

  -- CAIXA (Tesouraria): Subtrair saída
  PERFORM public.update_site_treasury(v_amount, 'withdrawal', 'Saque automático aprovado (ID: ' || p_withdrawal_id || ')', auth.uid());

END;
$$;
