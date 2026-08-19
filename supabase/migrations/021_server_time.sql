-- ============================================================
-- PREMIAJÁ — Migration 021: Server Time Sync
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS numeric AS $$
BEGIN
  RETURN extract(epoch from now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
