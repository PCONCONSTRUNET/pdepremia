-- ─── Migration 009: Generate Boxes RPC ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_boxes_for_order(order_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = order_uuid;
  
  IF v_order.box_id IS NULL THEN
    RAISE EXCEPTION 'Pedido não é referente a uma box.';
  END IF;

  IF v_order.tickets_generated = true THEN
    RETURN;
  END IF;

  FOR i IN 1..v_order.quantity LOOP
    INSERT INTO public.user_boxes (user_id, order_id, box_definition_id, status)
    VALUES (v_order.user_id, v_order.id, v_order.box_id, 'available');
  END LOOP;

  UPDATE public.orders SET tickets_generated = true, updated_at = NOW() WHERE id = order_uuid;
END;
$$;
