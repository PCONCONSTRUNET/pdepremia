-- 1. Função: get_affiliate_referrals (Lista as últimas indicações de um parceiro específico pelo Admin)
CREATE OR REPLACE FUNCTION public.get_affiliate_referrals(p_affiliate_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz,
  has_deposited boolean,
  total_deposited numeric
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
    r.id as user_id,
    r.full_name,
    r.email,
    r.created_at,
    EXISTS(
      SELECT 1 FROM public.payments dp
      JOIN public.orders o ON o.id = dp.order_id
      WHERE o.user_id = r.id AND dp.status = 'approved'
    ) as has_deposited,
    COALESCE((
      SELECT SUM(dp.amount) FROM public.payments dp
      JOIN public.orders o ON o.id = dp.order_id
      WHERE o.user_id = r.id AND dp.status = 'approved'
    ), 0)::numeric as total_deposited
  FROM public.profiles r
  WHERE r.referred_by = p_affiliate_id
  ORDER BY r.created_at DESC;
END;
$$;
