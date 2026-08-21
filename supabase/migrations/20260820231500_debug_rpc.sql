CREATE OR REPLACE FUNCTION public.debug_get_payments()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_agg(row_to_json(p)) INTO res
  FROM public.payments p;
  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_get_payments() TO anon, authenticated, service_role;
