-- ─── Migration 007: Make boxes.campaign_id optional ─────────────────────────
-- Permite criar boxes globais (não vinculadas a uma campanha específica)
-- As boxes podem ser associadas a campanhas via lógica de negócio

-- 1. Remove the NOT NULL constraint on campaign_id in boxes table
ALTER TABLE public.boxes
  ALTER COLUMN campaign_id DROP NOT NULL;

-- 2. Also update the RLS policy for public read to handle null campaign_id
-- Old: requires is_active AND linked to public campaign
-- New: is_active is enough for boxes without campaign (global boxes)
DROP POLICY IF EXISTS "boxes_public_read" ON public.boxes;

CREATE POLICY "boxes_public_read" ON public.boxes
  FOR SELECT USING (
    is_active = true AND (
      campaign_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.campaigns WHERE id = campaign_id AND is_public = true
      )
    )
  );

-- 3. Seed the 4 default boxes (global, no campaign)
INSERT INTO public.boxes (name, campaign_id, description, image_url, quantity_per_order, is_active)
VALUES
  ('Box Comum',    NULL, 'Prêmios em dinheiro e bilhetes extras',   '/boxes/box-comum.png',    1, true),
  ('Box Rara',     NULL, 'Eletrônicos e prêmios de médio valor',    '/boxes/box-rara.png',     1, true),
  ('Box Épica',    NULL, 'Smartphones e viagens exclusivas',        '/boxes/box-epica.png',    1, true),
  ('Box Lendária', NULL, 'Carros, motos e prêmios milionários',     '/boxes/box-lendaria.png', 1, true)
ON CONFLICT DO NOTHING;
