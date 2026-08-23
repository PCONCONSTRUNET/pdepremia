-- ============================================================
-- PREMIAJÁ — Migration 049: Sistema de Parceiros / Afiliados
-- ============================================================

-- 1. Add columns to profiles for affiliate system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_affiliate boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliate_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_affiliate_code_idx ON public.profiles(affiliate_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- 2. Create RPC to upgrade a user to an affiliate (Admin only)
CREATE OR REPLACE FUNCTION public.admin_make_affiliate(
  p_user_id uuid,
  p_affiliate_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Ensure code is unique (handled by constraint, but we can pre-check)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = p_affiliate_code AND id != p_user_id) THEN
    RAISE EXCEPTION 'Este código de parceiro já está em uso.';
  END IF;

  UPDATE public.profiles
  SET 
    is_affiliate = true,
    affiliate_code = p_affiliate_code
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- 3. Create RPC to get affiliate stats
-- Returns a list of all affiliates with their total referrals, deposit count, and total deposited amount
CREATE OR REPLACE FUNCTION public.get_affiliate_stats()
RETURNS TABLE (
  affiliate_id uuid,
  full_name text,
  email text,
  affiliate_code text,
  total_referrals bigint,
  depositing_referrals bigint,
  total_deposited numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify admin
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
    COUNT(DISTINCT dp.user_id) as depositing_referrals,
    COALESCE(SUM(dp.amount), 0)::numeric as total_deposited
  FROM public.profiles p
  LEFT JOIN public.profiles r ON r.referred_by = p.id
  LEFT JOIN public.payments dp ON dp.user_id = r.id AND dp.status = 'approved'
  WHERE p.is_affiliate = true
  GROUP BY p.id, p.full_name, p.email, p.affiliate_code
  ORDER BY total_deposited DESC, total_referrals DESC;
END;
$$;

-- 4. Create RPC to map affiliate code on signup safely
CREATE OR REPLACE FUNCTION public.set_affiliate_by_code(
  p_user_id uuid,
  p_affiliate_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  -- We only allow setting it if the user doesn't have one yet
  -- and they are updating themselves
  IF auth.uid() != p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id INTO v_affiliate_id FROM public.profiles WHERE affiliate_code = p_affiliate_code;

  IF v_affiliate_id IS NOT NULL THEN
    UPDATE public.profiles SET referred_by = v_affiliate_id WHERE id = p_user_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 5. Create RPC for a partner to see their own stats
CREATE OR REPLACE FUNCTION public.get_my_affiliate_stats()
RETURNS TABLE (
  total_referrals bigint,
  depositing_referrals bigint,
  total_deposited numeric,
  affiliate_code text
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
    COUNT(DISTINCT dp.user_id) as depositing_referrals,
    COALESCE(SUM(dp.amount), 0)::numeric as total_deposited,
    p.affiliate_code
  FROM public.profiles p
  LEFT JOIN public.profiles r ON r.referred_by = p.id
  LEFT JOIN public.payments dp ON dp.user_id = r.id AND dp.status = 'approved'
  WHERE p.id = v_user_id AND p.is_affiliate = true
  GROUP BY p.id, p.affiliate_code;
END;
$$;

-- 6. Create RPC for a partner to list their referred users
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  created_at timestamptz,
  has_deposited boolean,
  total_deposited numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    r.id as user_id,
    -- Obfuscate the name for privacy, e.g., "L*** S***"
    regexp_replace(r.full_name, '\B\w', '*', 'g') as full_name,
    r.created_at,
    EXISTS(SELECT 1 FROM public.payments p WHERE p.user_id = r.id AND p.status = 'approved') as has_deposited,
    COALESCE((SELECT SUM(amount) FROM public.payments p WHERE p.user_id = r.id AND p.status = 'approved'), 0)::numeric as total_deposited
  FROM public.profiles r
  WHERE r.referred_by = v_user_id
  ORDER BY r.created_at DESC;
END;
$$;
