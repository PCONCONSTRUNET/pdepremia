-- ============================================================
-- PREMIAJÁ — Migration 026: Secure Draw RPC
-- ============================================================

-- Function to securely draw a winner for a campaign on the backend
CREATE OR REPLACE FUNCTION public.draw_campaign_winner(campaign_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
  v_prize public.prizes%ROWTYPE;
  v_winning_ticket public.tickets%ROWTYPE;
  v_total_entries integer;
  v_draw_id uuid;
BEGIN
  -- 1. Lock the campaign to prevent concurrent draws
  SELECT * INTO v_campaign 
  FROM public.campaigns 
  WHERE id = campaign_uuid 
  FOR UPDATE;

  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_campaign.status != 'active' THEN
    RAISE EXCEPTION 'Campaign is not active';
  END IF;

  -- 2. Get the main prize (first one created)
  SELECT * INTO v_prize 
  FROM public.prizes 
  WHERE campaign_id = campaign_uuid 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_prize.id IS NULL THEN
    RAISE EXCEPTION 'No prizes configured for this campaign';
  END IF;

  -- 3. Get total entries
  SELECT count(*) INTO v_total_entries 
  FROM public.tickets 
  WHERE campaign_id = campaign_uuid;

  IF v_total_entries = 0 THEN
    RAISE EXCEPTION 'No tickets sold for this campaign';
  END IF;

  -- 4. Select a random winning ticket securely
  SELECT * INTO v_winning_ticket 
  FROM public.tickets 
  WHERE campaign_id = campaign_uuid 
  ORDER BY random() 
  LIMIT 1;

  -- 5. Insert the draw record
  INSERT INTO public.draws (
    campaign_id,
    prize_id,
    name,
    method,
    total_entries,
    status,
    winner_user_id,
    result_ticket_number,
    draw_date,
    drawn_at
  ) VALUES (
    campaign_uuid,
    v_prize.id,
    'Sorteio Principal',
    'random_db',
    v_total_entries,
    'completed',
    v_winning_ticket.user_id,
    v_winning_ticket.ticket_number,
    NOW(),
    NOW()
  ) RETURNING id INTO v_draw_id;

  -- 6. Update the campaign status
  UPDATE public.campaigns 
  SET status = 'finished', updated_at = NOW() 
  WHERE id = campaign_uuid;

  -- 7. Create Notification for the winner
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_winning_ticket.user_id,
    'Você foi sorteado!',
    'Parabéns! Você ganhou o prêmio principal do sorteio: ' || v_campaign.name || '. Verifique seus prêmios!',
    'sorteio_winner'
  );

  -- 8. Return success payload
  RETURN jsonb_build_object(
    'draw_id', v_draw_id,
    'winner_user_id', v_winning_ticket.user_id,
    'ticket_number', v_winning_ticket.ticket_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
