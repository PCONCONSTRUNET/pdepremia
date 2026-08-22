-- ============================================================
-- PREMIAJÁ — Migration 039: Secure Webhook RPC Access
-- ============================================================

-- 1. REVOKE PUBLIC ACCESS: Prevent any user from calling this RPC
REVOKE EXECUTE ON FUNCTION public.process_payment_webhook(uuid) FROM anon, authenticated;

-- 2. ENSURE SERVICE ROLE CAN EXECUTE (Edge functions use service role)
GRANT EXECUTE ON FUNCTION public.process_payment_webhook(uuid) TO service_role;
