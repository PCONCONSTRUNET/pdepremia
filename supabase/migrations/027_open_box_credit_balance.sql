-- ─── Migration 027: open_box – creditar saldo + prêmios infinitos em boxes ──────
--
-- Problemas corrigidos:
-- 1. Prêmios de box tinham remaining=1 e se esgotavam após 1 sorteio.
--    Em Mystery Boxes, prêmios devem ser infinitos (qualquer um pode sair sempre).
-- 2. Saldo não era creditado quando o prêmio tinha reference_value.
--
-- Soluções:
-- A) open_box não filtra por remaining > 0 (prêmios de box são infinitos)
-- B) open_box não decrementa remaining (não faz sentido para boxes)
-- C) Credita balance + wallet_transaction quando prize_value > 0
-- D) Repõe remaining dos prêmios de box para 9999 para não travar o admin

-- Atualiza remaining dos prêmios que estão zerados em boxes
UPDATE public.prizes
SET remaining = 9999
WHERE box_id IS NOT NULL
  AND remaining = 0
  AND status = 'active';

-- Adiciona 'prize' ao type constraint de wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'admin_bonus', 'promo_code', 'bet', 'win', 'prize'));

-- Recria a função open_box corrigida
CREATE OR REPLACE FUNCTION public.open_box(p_user_box_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_box     record;
  v_prize        record;
  v_winner_id    uuid;
  v_display_name text;
BEGIN
  -- 1. Verificar se a box pertence ao usuário logado e está disponível
  SELECT * INTO v_user_box
  FROM public.user_boxes
  WHERE id = p_user_box_id
    AND status = 'available'
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Box indisponível, já aberta ou não pertence ao usuário';
  END IF;

  -- Buscar nome do usuário para display_name
  SELECT COALESCE(
    SPLIT_PART(full_name, ' ', 1) || ' ' || LEFT(SPLIT_PART(full_name, ' ', 2), 1) || '.',
    email,
    'Usuário'
  ) INTO v_display_name
  FROM public.profiles
  WHERE id = v_user_box.user_id;

  -- 2. Selecionar um prêmio aleatório desta box
  --    NOTA: Prêmios de box são infinitos — não filtramos por remaining > 0
  SELECT * INTO v_prize
  FROM public.prizes
  WHERE box_id = v_user_box.box_definition_id
    AND status = 'active'
  ORDER BY random()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum prêmio cadastrado nesta box. Contate o administrador.';
  END IF;

  -- 3. Atualizar status da box do usuário
  UPDATE public.user_boxes
  SET status = 'opened',
      result_prize_id = v_prize.id,
      opened_at = now()
  WHERE id = p_user_box_id;

  -- 4. Registrar o vencedor na tabela de ganhadores
  INSERT INTO public.winners (
    box_id,
    prize_id,
    user_id,
    source,
    display_name,
    won_at,
    is_public
  ) VALUES (
    v_user_box.box_definition_id,
    v_prize.id,
    v_user_box.user_id,
    'box',
    v_display_name,
    now(),
    true
  ) RETURNING id INTO v_winner_id;

  -- 5. Se o prêmio tiver valor monetário, creditar na carteira do usuário
  IF v_prize.reference_value IS NOT NULL AND v_prize.reference_value > 0 THEN
    INSERT INTO public.wallet_transactions (user_id, amount, type, status)
    VALUES (
      v_user_box.user_id,
      v_prize.reference_value,
      'prize',
      'completed'
    );

    -- Incrementar saldo no perfil
    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + v_prize.reference_value
    WHERE id = v_user_box.user_id;
  END IF;

  RETURN json_build_object(
    'success',         true,
    'prize_id',        v_prize.id,
    'prize_name',      v_prize.name,
    'prize_image_url', v_prize.image_url,
    'prize_value',     v_prize.reference_value
  );
END;
$$;
