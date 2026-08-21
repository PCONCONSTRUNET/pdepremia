-- Processamento de Webhook de Pagamentos Seguros (RPC)
-- Função projetada para ser chamada via Edge Function no momento do Webhook da MisticPay.
-- Garante Atomicidade (sem Race Conditions) ao alterar status e entregar prêmios/saldo.

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
  
  RETURN TRUE;
END;
$$;

-- Permite que apenas a role anon ou authenticated acessem via RPC, ou service_role
GRANT EXECUTE ON FUNCTION public.process_payment_webhook(uuid) TO authenticated, anon, service_role;
