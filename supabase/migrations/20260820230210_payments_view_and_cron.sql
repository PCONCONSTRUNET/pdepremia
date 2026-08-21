-- Função para cancelar pagamentos pendentes após 10 minutos
CREATE OR REPLACE FUNCTION public.cancel_expired_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cancela pedidos pendentes com mais de 10 minutos
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status = 'awaiting_payment'
    AND created_at < NOW() - INTERVAL '10 minutes';

  -- Cancela pagamentos pendentes com mais de 10 minutos (inclui checkout e depositos)
  -- NOTA: O status na tabela payments deve ser 'rejected' ou 'refunded', pois 'cancelled' não é permitido no CHECK.
  UPDATE public.payments
  SET status = 'rejected'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_expired_payments() TO authenticated, service_role;
