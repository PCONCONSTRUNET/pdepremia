-- ============================================================
-- PREMIAJÁ — Migration 003: RPC Functions (SECURITY DEFINER)
-- ============================================================

-- Helper: generate sequence ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_numbers(campaign_uuid uuid, amount integer)
RETURNS text[] AS $$
DECLARE
  current_max integer;
  numbers text[];
BEGIN
  -- Get the current maximum ticket number for this campaign
  SELECT COALESCE(MAX(ticket_number::integer), 0) INTO current_max
  FROM public.tickets
  WHERE campaign_id = campaign_uuid AND ticket_number ~ '^[0-9]+$';
  
  -- Generate array of next numbers
  SELECT array_agg(lpad((current_max + i)::text, 6, '0')) INTO numbers
  FROM generate_series(1, amount) AS i;
  
  RETURN numbers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Core Function: Generate tickets for a paid order
CREATE OR REPLACE FUNCTION public.generate_tickets_for_order(order_uuid uuid)
RETURNS void AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_ticket_numbers text[];
  v_i integer;
  v_current_number text;
  v_instant_assignment record;
  v_ticket_id uuid;
BEGIN
  -- Lock the order to prevent race conditions
  SELECT * INTO v_order FROM public.orders WHERE id = order_uuid FOR UPDATE;
  
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'paid' THEN
    RAISE EXCEPTION 'Order is not paid';
  END IF;

  IF v_order.tickets_generated = true THEN
    -- Idempotent: already generated
    RETURN;
  END IF;

  -- Generate ticket numbers
  v_ticket_numbers := public.generate_ticket_numbers(v_order.campaign_id, v_order.quantity);

  -- Insert tickets one by one to check for instant prizes
  FOR v_i IN 1..array_length(v_ticket_numbers, 1) LOOP
    v_current_number := v_ticket_numbers[v_i];
    
    -- Insert the ticket
    INSERT INTO public.tickets (
      campaign_id,
      user_id,
      order_id,
      ticket_number,
      ticket_type,
      status
    ) VALUES (
      v_order.campaign_id,
      v_order.user_id,
      v_order.id,
      v_current_number,
      'common',
      'unrevealed'
    ) RETURNING id INTO v_ticket_id;

    -- Check if there's an instant prize assignment for this number
    -- (This means the admin pre-assigned prizes to specific ticket numbers)
    SELECT * INTO v_instant_assignment 
    FROM public.instant_prize_assignments 
    WHERE campaign_id = v_order.campaign_id AND ticket_number = v_current_number
    FOR UPDATE SKIP LOCKED;

    IF v_instant_assignment.id IS NOT NULL THEN
      -- Update ticket type to indicate it contains an instant prize (optional, depending on mechanics)
      -- For surprise mechanics, we leave it 'common' and let the reveal process discover it.
      -- But we MUST link the assignment to the generated ticket
      UPDATE public.instant_prize_assignments
      SET ticket_id = v_ticket_id
      WHERE id = v_instant_assignment.id;
    END IF;

  END LOOP;

  -- Mark order as tickets generated
  UPDATE public.orders 
  SET tickets_generated = true, updated_at = NOW() 
  WHERE id = order_uuid;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (auth.uid(), 'TICKETS_GENERATED', 'orders', order_uuid, jsonb_build_object('quantity', v_order.quantity));

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Core Function: Reveal Ticket (If Edge Functions are not used, this serves as backend logic)
CREATE OR REPLACE FUNCTION public.reveal_ticket(ticket_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_assignment public.instant_prize_assignments%ROWTYPE;
  v_prize public.prizes%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Lock ticket
  SELECT * INTO v_ticket FROM public.tickets WHERE id = ticket_uuid AND user_id = auth.uid() FOR UPDATE SKIP LOCKED;
  
  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or already locked';
  END IF;

  IF v_ticket.revealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ticket already revealed';
  END IF;

  -- Check if ticket is assigned a prize
  SELECT * INTO v_assignment FROM public.instant_prize_assignments WHERE ticket_id = v_ticket.id FOR UPDATE;

  IF v_assignment.id IS NOT NULL THEN
    -- Won a prize!
    SELECT * INTO v_prize FROM public.prizes WHERE id = v_assignment.prize_id;

    -- Update assignment
    UPDATE public.instant_prize_assignments SET revealed_at = NOW() WHERE id = v_assignment.id;

    -- Update ticket
    UPDATE public.tickets 
    SET revealed_at = NOW(), status = 'prize_won', instant_prize_id = v_prize.id
    WHERE id = v_ticket.id;

    -- Insert into winners
    INSERT INTO public.winners (
      campaign_id, user_id, prize_id, ticket_id, source, display_name, display_ticket, is_public
    ) 
    SELECT 
      v_ticket.campaign_id, 
      v_ticket.user_id, 
      v_prize.id, 
      v_ticket.id, 
      'instant', 
      split_part(p.full_name, ' ', 1) || ' ' || substring(split_part(p.full_name, ' ', 2) from 1 for 1) || '.', 
      v_ticket.ticket_number, 
      v_prize.is_public
    FROM public.profiles p WHERE p.id = v_ticket.user_id;

    v_result := jsonb_build_object('won', true, 'prize', to_jsonb(v_prize));
  ELSE
    -- No prize
    UPDATE public.tickets SET revealed_at = NOW(), status = 'no_prize' WHERE id = v_ticket.id;
    v_result := jsonb_build_object('won', false);
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (auth.uid(), 'TICKET_REVEALED', 'tickets', ticket_uuid, v_result);

  RETURN v_result;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
