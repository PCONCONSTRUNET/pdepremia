-- ============================================================
-- PREMIAJÁ — Migration 044: LGPD + Banned User Session Lock
-- ============================================================
-- Fix 1: Hash CPF in plain text (LGPD compliance)
-- Fix 2: Block banned users at RLS level (session-level enforcement)
-- ============================================================


-- =============================================================
-- FIX 1: CPF HASHING — LGPD COMPLIANCE
-- =============================================================
-- The profiles table stores CPF as plain text (Migration 005).
-- This violates LGPD. We will:
--   a) Ensure pgcrypto is active (for SHA-256)
--   b) Backfill existing CPFs: hash them into cpf_hash
--   c) Create a trigger to auto-hash on INSERT/UPDATE going forward
--   d) NULL out the plain-text cpf column (keep column for transition)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- a) Ensure cpf_hash column exists (from migration 001 schema)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_hash text;

-- b) Backfill: hash all existing plain-text CPFs
--    We strip non-digits before hashing to normalize (e.g. "123.456.789-00" -> "12345678900")
UPDATE public.profiles
SET
  cpf_hash = encode(
    digest(regexp_replace(cpf, '[^0-9]', '', 'g'), 'sha256'),
    'hex'
  )
WHERE
  cpf IS NOT NULL
  AND cpf != ''
  AND cpf_hash IS NULL;

-- c) Create trigger to auto-hash CPF on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.hash_cpf_before_save()
RETURNS trigger AS $$
BEGIN
  -- Hash the CPF if it is being set
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    -- Normalize: remove non-digit characters before hashing
    NEW.cpf_hash := encode(
      digest(regexp_replace(NEW.cpf, '[^0-9]', '', 'g'), 'sha256'),
      'hex'
    );
    -- Nullify plain text to prevent storage of raw CPF
    NEW.cpf := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_hash_cpf ON public.profiles;
CREATE TRIGGER tr_hash_cpf
BEFORE INSERT OR UPDATE OF cpf ON public.profiles
FOR EACH ROW
WHEN (NEW.cpf IS NOT NULL)
EXECUTE FUNCTION public.hash_cpf_before_save();

-- d) Nullify all existing plain-text CPFs now that they are hashed
UPDATE public.profiles
SET cpf = NULL
WHERE cpf IS NOT NULL;

-- Note: The cpf column is kept for backward compat with frontend code.
-- Once frontend is updated to never read plain-text CPF, the column can be dropped.
-- To verify: SELECT id, email, cpf, cpf_hash FROM profiles WHERE cpf IS NOT NULL;
-- Expected: 0 rows (all should be NULL now)


-- =============================================================
-- FIX 2: BLOCK BANNED USERS AT RLS LEVEL
-- =============================================================
-- Currently, banned users keep their JWT session active until they refresh.
-- This means they can still call RPCs and read data.
-- Solution: Add a fast helper function that checks the user's status,
-- then apply it to all sensitive RLS policies.
-- With this fix, even with a valid JWT, a banned user gets DENIED
-- at the database level on every single operation.

-- Helper: returns TRUE if the current user is active (not banned/suspended)
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply to ORDERS
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

-- Apply to TICKETS
DROP POLICY IF EXISTS "tickets_select_own" ON public.tickets;
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

-- Apply to USER BOXES
DROP POLICY IF EXISTS "user_boxes_select_own" ON public.user_boxes;
CREATE POLICY "user_boxes_select_own" ON public.user_boxes
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

-- Apply to USER WHEEL SPINS
DROP POLICY IF EXISTS "spins_select_own" ON public.user_wheel_spins;
CREATE POLICY "spins_select_own" ON public.user_wheel_spins
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

-- Apply to WITHDRAWALS
DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own" ON public.withdrawals
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

-- Apply to NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id AND public.is_active_user()
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id AND public.is_active_user()
  );

-- Apply to USER REWARDS
DROP POLICY IF EXISTS "Users can view own rewards" ON public.user_rewards;
CREATE POLICY "Users can view own rewards" ON public.user_rewards
  FOR SELECT USING (
    auth.uid() = user_id AND public.is_active_user()
  );

-- Apply to DOUBLE BETS (defense-in-depth on top of SECURITY DEFINER RPCs)
ALTER TABLE IF EXISTS public.double_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "double_bets_select_own" ON public.double_bets;
CREATE POLICY "double_bets_select_own" ON public.double_bets
  FOR SELECT USING (
    (user_id = auth.uid() AND public.is_active_user())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "double_bets_no_direct_insert" ON public.double_bets;
CREATE POLICY "double_bets_no_direct_insert" ON public.double_bets
  FOR INSERT WITH CHECK (false);

-- Apply to SUPPORT CONVERSATIONS
DROP POLICY IF EXISTS "Users can view their own conversation" ON public.support_conversations;
CREATE POLICY "Users can view their own conversation" ON public.support_conversations
  FOR SELECT USING (
    auth.uid() = user_id AND public.is_active_user()
  );

DROP POLICY IF EXISTS "Users can manage their own conversation" ON public.support_conversations;
CREATE POLICY "Users can manage their own conversation" ON public.support_conversations
  FOR ALL USING (
    auth.uid() = user_id AND public.is_active_user()
  );

-- Apply to SUPPORT MESSAGES
DROP POLICY IF EXISTS "Users can insert messages in their conversation" ON public.support_messages;
CREATE POLICY "Users can insert messages in their conversation"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        public.is_active_user() AND
        EXISTS (
            SELECT 1 FROM support_conversations
            WHERE support_conversations.id = support_messages.conversation_id
            AND support_conversations.user_id = auth.uid()
        )
    );

-- =============================================================
-- VERIFICATION QUERIES (run manually after applying)
-- =============================================================
-- 1. Confirm no plain CPFs remain:
--    SELECT COUNT(*) FROM profiles WHERE cpf IS NOT NULL;
--    Expected: 0

-- 2. Confirm CPF hashes were backfilled:
--    SELECT COUNT(*) FROM profiles WHERE cpf_hash IS NOT NULL;
--    Expected: number of users who had CPF registered

-- 3. Confirm is_active_user function exists:
--    SELECT public.is_active_user();
--    Expected: true (if logged in as active user)