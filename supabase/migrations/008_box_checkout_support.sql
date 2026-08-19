-- ─── Migration 008: Box Checkout Support ──────────────────────────────────────

-- 1. Tabela Orders: permitir box_id em vez de campaign_id
ALTER TABLE public.orders ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE;

-- 2. Tabela user_boxes: permitir campaign_id null
ALTER TABLE public.user_boxes ALTER COLUMN campaign_id DROP NOT NULL;

-- 3. Tabela prizes: adicionar box_id e remover NOT NULL de campaign_id
ALTER TABLE public.prizes ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE public.prizes ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE;

-- 4. Tabela winners: adicionar box_id e remover NOT NULL de campaign_id (para registrar quem ganha em box global)
ALTER TABLE public.winners ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE public.winners ADD COLUMN IF NOT EXISTS box_id uuid REFERENCES public.boxes(id) ON DELETE CASCADE;

-- 5. Função RPC open_box
CREATE OR REPLACE FUNCTION public.open_box(p_user_box_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_box record;
  v_prize record;
  v_winner_id uuid;
BEGIN
  -- Verificar se a box pertence ao usuário logado e está disponível
  SELECT * INTO v_user_box FROM public.user_boxes 
  WHERE id = p_user_box_id AND status = 'available' AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box indisponível, já aberta ou não pertence ao usuário';
  END IF;

  -- Selecionar um prêmio aleatório desta box que ainda tenha estoque
  SELECT * INTO v_prize FROM public.prizes
  WHERE box_id = v_user_box.box_definition_id AND status = 'active' AND remaining > 0
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum prêmio disponível nesta box no momento.';
  END IF;

  -- Deduzir estoque do prêmio
  UPDATE public.prizes 
  SET remaining = remaining - 1 
  WHERE id = v_prize.id;

  -- Atualizar status da box do usuário
  UPDATE public.user_boxes
  SET status = 'opened', result_prize_id = v_prize.id, opened_at = now()
  WHERE id = p_user_box_id;

  -- Registrar o vencedor na tabela de ganhadores
  INSERT INTO public.winners (
    box_id, 
    prize_id, 
    user_id, 
    ticket_number, 
    won_at, 
    is_public
  ) VALUES (
    v_user_box.box_definition_id,
    v_prize.id,
    v_user_box.user_id,
    'BOX-' || substr(v_user_box.id::text, 1, 8),
    now(),
    true
  ) RETURNING id INTO v_winner_id;

  RETURN json_build_object(
    'success', true,
    'prize_id', v_prize.id,
    'prize_name', v_prize.name,
    'prize_image_url', v_prize.image_url,
    'prize_value', v_prize.reference_value
  );
END;
$$;
