-- ============================================================
-- PREMIAJÁ — Migration 002: RLS Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instant_prize_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wheel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin/operator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'operator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin());

-- ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
-- Public: anyone can read active public campaigns
CREATE POLICY "campaigns_public_read" ON public.campaigns
  FOR SELECT USING (is_public = true AND status IN ('active', 'paused', 'ended'));

-- Authenticated: can read all public campaigns
CREATE POLICY "campaigns_auth_read" ON public.campaigns
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_public = true);

-- Admin/Operator: full access
CREATE POLICY "campaigns_admin_all" ON public.campaigns
  FOR ALL USING (public.is_admin());

-- ─── PRIZES ──────────────────────────────────────────────────────────────────
CREATE POLICY "prizes_public_read" ON public.prizes
  FOR SELECT USING (
    is_public = true AND EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_id AND is_public = true AND status IN ('active', 'paused', 'ended')
    )
  );

CREATE POLICY "prizes_admin_all" ON public.prizes
  FOR ALL USING (public.is_admin());

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.is_admin());

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
    OR public.is_admin()
  );

-- Only Edge Functions (SECURITY DEFINER) insert payments
CREATE POLICY "payments_no_direct_insert" ON public.payments
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (public.is_admin());

-- ─── TICKETS ─────────────────────────────────────────────────────────────────
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

-- Tickets are inserted ONLY by SECURITY DEFINER RPC functions
CREATE POLICY "tickets_no_direct_insert" ON public.tickets
  FOR INSERT WITH CHECK (false);

-- Tickets are updated ONLY by SECURITY DEFINER Edge Functions
CREATE POLICY "tickets_no_direct_update" ON public.tickets
  FOR UPDATE USING (false);

CREATE POLICY "tickets_admin_all" ON public.tickets
  FOR ALL USING (public.is_admin());

-- ─── INSTANT PRIZE ASSIGNMENTS (CRITICAL — NEVER EXPOSED) ─────────────────
-- Only admins can see this table. Edge functions use SECURITY DEFINER
CREATE POLICY "ipa_admin_only" ON public.instant_prize_assignments
  FOR ALL USING (public.is_admin());

-- ─── BOXES ───────────────────────────────────────────────────────────────────
CREATE POLICY "boxes_public_read" ON public.boxes
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.campaigns WHERE id = campaign_id AND is_public = true
    )
  );

CREATE POLICY "boxes_admin_all" ON public.boxes
  FOR ALL USING (public.is_admin());

-- ─── USER BOXES ──────────────────────────────────────────────────────────────
CREATE POLICY "user_boxes_select_own" ON public.user_boxes
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_boxes_no_direct_insert" ON public.user_boxes
  FOR INSERT WITH CHECK (false);

CREATE POLICY "user_boxes_admin_all" ON public.user_boxes
  FOR ALL USING (public.is_admin());

-- ─── WHEELS / WHEEL ITEMS ────────────────────────────────────────────────────
CREATE POLICY "wheels_public_read" ON public.wheels
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.campaigns WHERE id = campaign_id AND is_public = true
    )
  );

CREATE POLICY "wheels_admin_all" ON public.wheels
  FOR ALL USING (public.is_admin());

CREATE POLICY "wheel_items_public_read" ON public.wheel_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.wheels w
      JOIN public.campaigns c ON c.id = w.campaign_id
      WHERE w.id = wheel_id AND c.is_public = true
    )
  );

CREATE POLICY "wheel_items_admin_all" ON public.wheel_items
  FOR ALL USING (public.is_admin());

-- ─── USER WHEEL SPINS ────────────────────────────────────────────────────────
CREATE POLICY "spins_select_own" ON public.user_wheel_spins
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "spins_no_direct_insert" ON public.user_wheel_spins
  FOR INSERT WITH CHECK (false);

CREATE POLICY "spins_admin_all" ON public.user_wheel_spins
  FOR ALL USING (public.is_admin());

-- ─── DRAWS ───────────────────────────────────────────────────────────────────
CREATE POLICY "draws_public_read" ON public.draws
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = campaign_id AND is_public = true
    )
  );

CREATE POLICY "draws_admin_all" ON public.draws
  FOR ALL USING (public.is_admin());

-- ─── WINNERS ─────────────────────────────────────────────────────────────────
-- Public: anyone sees is_public winners
CREATE POLICY "winners_public_read" ON public.winners
  FOR SELECT USING (is_public = true);

-- Authenticated: see own winners
CREATE POLICY "winners_own_read" ON public.winners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "winners_admin_all" ON public.winners
  FOR ALL USING (public.is_admin());

-- ─── PRIZE CLAIMS ────────────────────────────────────────────────────────────
CREATE POLICY "claims_own_read" ON public.prize_claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.winners WHERE id = winner_id AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "claims_admin_all" ON public.prize_claims
  FOR ALL USING (public.is_admin());

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
-- Only admins can read. No one updates or deletes.
CREATE POLICY "audit_admin_read" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

-- Audit logs are inserted only by SECURITY DEFINER functions
CREATE POLICY "audit_no_direct_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (false);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────────
-- Public can read non-sensitive settings
CREATE POLICY "settings_public_read" ON public.system_settings
  FOR SELECT USING (key IN ('platform_name', 'pix_key', 'pix_beneficiary', 'daily_wheel_prizes'));

CREATE POLICY "settings_admin_all" ON public.system_settings
  FOR ALL USING (public.is_admin());
