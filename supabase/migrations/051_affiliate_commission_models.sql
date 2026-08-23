-- ============================================================
-- PREMIAJÁ — Migration 051: Modelos de Comissão de Afiliados
-- ============================================================

-- 1. Add Commission Columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpa_value numeric(10,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS revshare_percentage numeric(5,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpa_paid boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_earnings numeric(10,2) DEFAULT 0;

-- 2. Update Admin Save Affiliate RPC (Replaces admin_make_affiliate)
DROP FUNCTION IF EXISTS public.admin_make_affiliate(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_save_affiliate(
  p_user_id uuid,
  p_affiliate_code text,
  p_cpa_value numeric DEFAULT 0,
  p_revshare_percentage numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.profiles 
  SET is_affiliate = true, 
      affiliate_code = p_affiliate_code,
      cpa_value = p_cpa_value,
      revshare_percentage = p_revshare_percentage
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- 3. Update Webhook to process CPA and RevShare
CREATE OR REPLACE FUNCTION public.process_payment_webhook(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_referrer_id uuid;
  v_cpa_paid boolean;
  v_cpa_value numeric;
  v_revshare numeric;
  v_commission numeric;
BEGIN
  -- Obter pedido e travar a linha para leitura (evita race condition)
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado (ID: %).', p_order_id;
  END IF;

  -- Se já estiver pago, ignora com sucesso (idempotência)
  IF v_order.status = 'paid' THEN
    RETURN TRUE;
  END IF;

  -- Atualizar status do pedido para pago
  UPDATE public.orders 
  SET status = 'paid', updated_at = now()
  WHERE id = p_order_id;

  -- Atualizar pagamento relacionado se existir
  UPDATE public.payments 
  SET status = 'confirmed', confirmed_at = now() 
  WHERE order_id = p_order_id;

  -- Depósito de Saldo na Carteira do Cliente (se for compra de saldo direto)
  IF v_order.campaign_id IS NULL AND v_order.box_id IS NULL THEN
    UPDATE public.profiles 
    SET balance = balance + v_order.total_amount 
    WHERE id = v_order.user_id;
  END IF;

  -- Lógica de Comissionamento de Afiliado
  IF v_order.user_id IS NOT NULL THEN
    SELECT referred_by, cpa_paid INTO v_referrer_id, v_cpa_paid 
    FROM public.profiles WHERE id = v_order.user_id;

    IF v_referrer_id IS NOT NULL THEN
      SELECT cpa_value, revshare_percentage INTO v_cpa_value, v_revshare
      FROM public.profiles WHERE id = v_referrer_id AND is_affiliate = true;

      v_commission := 0;

      -- CPA (Apenas na primeira conversão)
      IF v_cpa_value > 0 AND (v_cpa_paid IS NULL OR v_cpa_paid = false) THEN
        v_commission := v_commission + v_cpa_value;
        UPDATE public.profiles SET cpa_paid = true WHERE id = v_order.user_id;
      END IF;

      -- RevShare (Porcentagem sobre o pagamento atual)
      IF v_revshare > 0 THEN
        v_commission := v_commission + (v_order.total_amount * (v_revshare / 100));
      END IF;

      -- Distribuir o lucro
      IF v_commission > 0 THEN
        UPDATE public.profiles 
        SET balance = balance + v_commission,
            total_earnings = COALESCE(total_earnings, 0) + v_commission
        WHERE id = v_referrer_id;
        
        -- Opcional: Historico de auditoria para afiliado
        INSERT INTO public.audit_logs (user_id, action, entity, entity_id, new_data)
        VALUES (
          v_referrer_id, 
          'AFFILIATE_COMMISSION', 
          'payments', 
          p_order_id, 
          jsonb_build_object('commission', v_commission, 'source_user', v_order.user_id, 'order_amount', v_order.total_amount)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Permite que apenas a role anon ou authenticated acessem via RPC, ou service_role
GRANT EXECUTE ON FUNCTION public.process_payment_webhook(uuid) TO authenticated, anon, service_role;


-- 4. Update Stats RPCs
DROP FUNCTION IF EXISTS public.get_affiliate_stats();
CREATE OR REPLACE FUNCTION public.get_affiliate_stats()
RETURNS TABLE (
  affiliate_id uuid,
  full_name text,
  email text,
  affiliate_code text,
  total_referrals bigint,
  depositing_referrals bigint,
  total_deposited numeric,
  cpa_value numeric,
  revshare_percentage numeric,
  total_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as affiliate_id,
    p.full_name,
    p.email,
    p.affiliate_code,
    COUNT(DISTINCT r.id) as total_referrals,
    COUNT(DISTINCT o.user_id) FILTER (WHERE dp.id IS NOT NULL) as depositing_referrals,
    COALESCE(SUM(dp.amount), 0)::numeric as total_deposited,
    p.cpa_value,
    p.revshare_percentage,
    COALESCE(p.total_earnings, 0) as total_earnings
  FROM public.profiles p
  LEFT JOIN public.profiles r ON r.referred_by = p.id
  LEFT JOIN public.orders o ON o.user_id = r.id
  LEFT JOIN public.payments dp ON dp.order_id = o.id AND dp.status = 'approved'
  WHERE p.is_affiliate = true
  GROUP BY p.id, p.full_name, p.email, p.affiliate_code, p.cpa_value, p.revshare_percentage, p.total_earnings
  ORDER BY total_deposited DESC, total_referrals DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.get_my_affiliate_stats();
CREATE OR REPLACE FUNCTION public.get_my_affiliate_stats()
RETURNS TABLE (
  total_referrals bigint,
  depositing_referrals bigint,
  total_deposited numeric,
  affiliate_code text,
  cpa_value numeric,
  revshare_percentage numeric,
  total_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT r.id) as total_referrals,
    COUNT(DISTINCT o.user_id) FILTER (WHERE dp.id IS NOT NULL) as depositing_referrals,
    COALESCE(SUM(dp.amount), 0)::numeric as total_deposited,
    p.affiliate_code,
    p.cpa_value,
    p.revshare_percentage,
    COALESCE(p.total_earnings, 0) as total_earnings
  FROM public.profiles p
  LEFT JOIN public.profiles r ON r.referred_by = p.id
  LEFT JOIN public.orders o ON o.user_id = r.id
  LEFT JOIN public.payments dp ON dp.order_id = o.id AND dp.status = 'approved'
  WHERE p.id = v_user_id AND p.is_affiliate = true
  GROUP BY p.id, p.affiliate_code, p.cpa_value, p.revshare_percentage, p.total_earnings;
END;
$$;
