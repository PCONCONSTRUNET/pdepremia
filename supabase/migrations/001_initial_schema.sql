-- ============================================================
-- PREMIAJÁ — Migration 001: Schema Inicial
-- Execute no Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL,
  phone         text,
  cpf_hash      text, -- SHA-256 do CPF, nunca plain text
  birth_date    date,
  role          text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'operator')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger: create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN NEW.email = 'pdepremia@gmail.com' THEN 'admin' ELSE 'client' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── CAMPAIGNS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campaigns (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                      text NOT NULL UNIQUE,
  name                      text NOT NULL,
  description               text,
  banner_url                text,
  regulations               text,
  start_date                timestamptz NOT NULL,
  end_date                  timestamptz NOT NULL,
  status                    text NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'active', 'paused', 'ended', 'archived')),
  max_tickets               integer NOT NULL DEFAULT 1000,
  max_tickets_per_user      integer,
  ticket_price              numeric(10,2) NOT NULL DEFAULT 10.00,
  has_instant_prizes        boolean NOT NULL DEFAULT false,
  has_boxes                 boolean NOT NULL DEFAULT false,
  has_wheel                 boolean NOT NULL DEFAULT false,
  has_main_draw             boolean NOT NULL DEFAULT false,
  is_public                 boolean NOT NULL DEFAULT false,
  audit_hash                text,
  audit_hash_generated_at   timestamptz,
  created_by                uuid NOT NULL REFERENCES public.profiles(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_slug_idx ON public.campaigns(slug);

-- ─── PRIZES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prizes (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  image_url        text,
  prize_type       text NOT NULL
                     CHECK (prize_type IN ('instant', 'draw', 'box', 'wheel', 'coupon', 'product', 'benefit')),
  quantity         integer NOT NULL DEFAULT 1,
  remaining        integer NOT NULL DEFAULT 1,
  reference_value  numeric(10,2),
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'exhausted', 'cancelled')),
  is_public        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prizes_campaign_idx ON public.prizes(campaign_id);
CREATE INDEX IF NOT EXISTS prizes_type_idx ON public.prizes(prize_type);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       uuid NOT NULL REFERENCES public.campaigns(id),
  user_id           uuid NOT NULL REFERENCES public.profiles(id),
  quantity          integer NOT NULL,
  unit_price        numeric(10,2) NOT NULL,
  total_amount      numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'cancelled', 'expired', 'refunded')),
  payment_method    text NOT NULL DEFAULT 'pix_manual'
                      CHECK (payment_method IN ('pix_manual', 'pix_gateway', 'card')),
  notes             text,
  tickets_generated boolean NOT NULL DEFAULT false,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_campaign_idx ON public.orders(campaign_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         uuid NOT NULL REFERENCES public.orders(id),
  amount           numeric(10,2) NOT NULL,
  method           text NOT NULL DEFAULT 'pix_manual',
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'rejected', 'refunded')),
  pix_key          text,
  pix_qrcode       text,
  pix_expiration   timestamptz,
  gateway_id       text,
  gateway_payload  jsonb,
  confirmed_at     timestamptz,
  confirmed_by     uuid REFERENCES public.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_order_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(status);

-- ─── TICKETS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tickets (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id               uuid NOT NULL REFERENCES public.campaigns(id),
  user_id                   uuid NOT NULL REFERENCES public.profiles(id),
  order_id                  uuid NOT NULL REFERENCES public.orders(id),
  ticket_number             text NOT NULL,
  ticket_type               text NOT NULL DEFAULT 'common'
                              CHECK (ticket_type IN ('common', 'instant_prize', 'box_eligible', 'wheel_eligible', 'special', 'draw')),
  status                    text NOT NULL DEFAULT 'unrevealed'
                              CHECK (status IN ('unrevealed', 'revealed', 'prize_won', 'no_prize', 'draw_participant', 'draw_winner', 'expired')),
  instant_prize_id          uuid REFERENCES public.prizes(id),
  revealed_at               timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Unique ticket number per campaign
CREATE UNIQUE INDEX IF NOT EXISTS tickets_number_campaign_idx ON public.tickets(campaign_id, ticket_number);
CREATE INDEX IF NOT EXISTS tickets_user_idx ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS tickets_order_idx ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(status);

-- ─── INSTANT PRIZE ASSIGNMENTS ───────────────────────────────────────────────
-- CRITICAL: Never exposed to client via RLS
CREATE TABLE IF NOT EXISTS public.instant_prize_assignments (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prize_id       uuid NOT NULL REFERENCES public.prizes(id),
  ticket_number  text NOT NULL, -- mapped before campaign starts
  ticket_id      uuid REFERENCES public.tickets(id), -- filled when ticket is generated
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  revealed_at    timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ipa_campaign_ticket_idx ON public.instant_prize_assignments(campaign_id, ticket_number);
CREATE INDEX IF NOT EXISTS ipa_campaign_idx ON public.instant_prize_assignments(campaign_id);

-- ─── BOXES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boxes (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id          uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name                 text NOT NULL DEFAULT 'Box da Sorte',
  description          text,
  image_url            text,
  quantity_per_order   integer NOT NULL DEFAULT 1,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── USER BOXES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_boxes (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id        uuid NOT NULL REFERENCES public.campaigns(id),
  user_id            uuid NOT NULL REFERENCES public.profiles(id),
  order_id           uuid NOT NULL REFERENCES public.orders(id),
  box_definition_id  uuid NOT NULL REFERENCES public.boxes(id),
  status             text NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available', 'opened', 'expired')),
  result_prize_id    uuid REFERENCES public.prizes(id),
  opened_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_boxes_user_idx ON public.user_boxes(user_id);
CREATE INDEX IF NOT EXISTS user_boxes_status_idx ON public.user_boxes(status);

-- ─── WHEELS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wheels (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT 'Roleta da Sorte',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wheel_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  wheel_id    uuid NOT NULL REFERENCES public.wheels(id) ON DELETE CASCADE,
  prize_id    uuid REFERENCES public.prizes(id),
  label       text NOT NULL,
  color       text NOT NULL DEFAULT '#6374f1',
  probability numeric(5,4) NOT NULL DEFAULT 0.1, -- sum must = 1 for all items in a wheel
  position    integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── USER WHEEL SPINS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_wheel_spins (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES public.campaigns(id),
  user_id          uuid NOT NULL REFERENCES public.profiles(id),
  order_id         uuid NOT NULL REFERENCES public.orders(id),
  wheel_id         uuid NOT NULL REFERENCES public.wheels(id),
  status           text NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available', 'used', 'expired')),
  result_item_id   uuid REFERENCES public.wheel_items(id),
  result_prize_id  uuid REFERENCES public.prizes(id),
  spun_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_spins_user_idx ON public.user_wheel_spins(user_id);
CREATE INDEX IF NOT EXISTS user_spins_status_idx ON public.user_wheel_spins(status);

-- ─── DRAWS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.draws (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id           uuid NOT NULL REFERENCES public.campaigns(id),
  name                  text NOT NULL,
  draw_date             timestamptz NOT NULL,
  prize_id              uuid NOT NULL REFERENCES public.prizes(id),
  method                text NOT NULL DEFAULT 'internal'
                          CHECK (method IN ('internal', 'federal_lottery', 'external')),
  external_reference    text,
  total_entries         integer NOT NULL DEFAULT 0,
  status                text NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'running', 'completed', 'cancelled')),
  result_ticket_number  text,
  winner_user_id        uuid REFERENCES public.profiles(id),
  drawn_at              timestamptz,
  rules_hash            text, -- hash of rules, generated before campaign activates
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── WINNERS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.winners (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id      uuid NOT NULL REFERENCES public.campaigns(id),
  user_id          uuid NOT NULL REFERENCES public.profiles(id),
  prize_id         uuid NOT NULL REFERENCES public.prizes(id),
  ticket_id        uuid REFERENCES public.tickets(id),
  source           text NOT NULL CHECK (source IN ('instant', 'box', 'wheel', 'draw')),
  display_name     text NOT NULL, -- e.g., "Lucas M."
  display_ticket   text,          -- e.g., "001782"
  is_public        boolean NOT NULL DEFAULT false,
  won_at           timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS winners_user_idx ON public.winners(user_id);
CREATE INDEX IF NOT EXISTS winners_public_idx ON public.winners(is_public) WHERE is_public = true;

-- ─── PRIZE CLAIMS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prize_claims (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  winner_id         uuid NOT NULL UNIQUE REFERENCES public.winners(id),
  status            text NOT NULL DEFAULT 'won'
                      CHECK (status IN ('won', 'pending_confirmation', 'separating', 'shipped', 'delivered', 'cancelled')),
  tracking_code     text,
  notes             text,
  redemption_code   text,
  handled_by        uuid REFERENCES public.profiles(id),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid REFERENCES public.profiles(id),
  action      text NOT NULL, -- e.g., 'PAYMENT_APPROVED', 'TICKET_REVEALED'
  entity      text NOT NULL, -- e.g., 'payments', 'tickets'
  entity_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         text NOT NULL UNIQUE,
  value       jsonb NOT NULL DEFAULT '{}',
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('platform_name', '"Premiajá"'),
  ('pix_key', '"pagamentos@premiaja.com.br"'),
  ('pix_beneficiary', '"Premiajá Campanhas"'),
  ('order_expiry_minutes', '30')
ON CONFLICT (key) DO NOTHING;
