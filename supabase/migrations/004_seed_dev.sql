-- ============================================================
-- PREMIAJÁ — Migration 004: Seed Data (Desenvolvimento)
-- ============================================================

-- Create a default admin user if it doesn't exist
-- For local development, we create an auth user first. If using Supabase CLI `supabase start`, we can insert into auth.users directly.

DO $$
DECLARE
  admin_id uuid;
  client_id uuid;
  camp_id uuid;
BEGIN
  -- Insert auth users (This requires postgres role to insert into auth schema)
  -- Skip if already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@premiaja.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (
      uuid_generate_v4(),
      'admin@premiaja.com',
      '{"full_name": "Admin Master"}'
    ) RETURNING id INTO admin_id;

    -- Update role to admin
    UPDATE public.profiles SET role = 'admin' WHERE id = admin_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cliente@teste.com') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (
      uuid_generate_v4(),
      'cliente@teste.com',
      '{"full_name": "João Cliente"}'
    ) RETURNING id INTO client_id;
  END IF;

  -- Create a default campaign
  SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.campaigns WHERE slug = 'campanha-inaugural') THEN
    INSERT INTO public.campaigns (
      name, slug, description, start_date, end_date, 
      status, ticket_price, max_tickets, has_instant_prizes, is_public, created_by
    ) VALUES (
      '🚀 Grande Sorteio Inaugural',
      'campanha-inaugural',
      'Nossa primeira grande campanha promocional.',
      NOW(),
      NOW() + interval '30 days',
      'active',
      25.00,
      1000,
      true,
      true,
      admin_id
    ) RETURNING id INTO camp_id;

    -- Create prizes for this campaign (removed dummy prizes)

  END IF;

END $$;
