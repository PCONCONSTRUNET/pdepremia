-- ============================================================
-- PREMIAJÁ — Migration 045: Admin Grant Bonus RPC
-- ============================================================
-- Allows admins to grant bonuses directly to any user:
--   - free_spins  : Giros grátis no Double (2, 5, 10, 15...)
--   - double_xp   : Multiplica XP do usuário por 2 (ou adiciona bônus)
--   - cashback    : Adiciona saldo como cashback
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_grant_bonus(
  p_target_user_id uuid,
  p_bonus_type text,           -- 'free_spins' | 'cashback' | 'double_xp'
  p_value numeric DEFAULT 0,   -- Para free_spins: valor por giro | Para cashback: valor em R$
  p_quantity integer DEFAULT 0 -- Para free_spins: quantidade de giros
)
RETURNS json AS $$
DECLARE
  v_caller_role text;
  v_target_name text;
BEGIN
  -- 1. Verificar que quem chama é admin
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role NOT IN ('admin', 'operator') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem conceder bônus.';
  END IF;

  -- 2. Verificar que o usuário alvo existe
  SELECT full_name INTO v_target_name FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- 3. Processar o bônus conforme o tipo
  IF p_bonus_type = 'free_spins' THEN
    -- Adiciona giros grátis no Double
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade de giros deve ser maior que zero.'; END IF;
    IF p_value <= 0 THEN RAISE EXCEPTION 'Valor por giro deve ser maior que zero.'; END IF;

    UPDATE public.profiles
    SET
      double_free_spins_count = COALESCE(double_free_spins_count, 0) + p_quantity,
      double_free_spins_value = p_value  -- Define o valor por giro
    WHERE id = p_target_user_id;

  ELSIF p_bonus_type = 'cashback' THEN
    -- Adiciona cashback no saldo
    IF p_value <= 0 THEN RAISE EXCEPTION 'Valor do cashback deve ser maior que zero.'; END IF;

    UPDATE public.profiles
    SET balance = COALESCE(balance, 0) + p_value
    WHERE id = p_target_user_id;

    INSERT INTO public.wallet_transactions (user_id, amount, type, status)
    VALUES (p_target_user_id, p_value, 'admin_bonus', 'completed');

  ELSIF p_bonus_type = 'double_xp' THEN
    -- Dobra o XP atual do usuário
    UPDATE public.profiles
    SET xp = COALESCE(xp, 0) * 2
    WHERE id = p_target_user_id;

  ELSE
    RAISE EXCEPTION 'Tipo de bônus inválido. Use: free_spins, cashback ou double_xp.';
  END IF;

  -- 4. Registrar na auditoria
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    auth.uid(),
    'ADMIN_GRANTED_BONUS',
    'profiles',
    p_target_user_id,
    jsonb_build_object(
      'bonus_type', p_bonus_type,
      'value', p_value,
      'quantity', p_quantity,
      'target_user', v_target_name,
      'granted_by', auth.uid()
    )
  );

  -- 5. Enviar notificação ao usuário
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_target_user_id,
    CASE p_bonus_type
      WHEN 'free_spins' THEN '🎰 Giros Grátis Recebidos!'
      WHEN 'cashback'   THEN '💰 Cashback Creditado!'
      WHEN 'double_xp'  THEN '⚡ XP Dobrado!'
    END,
    CASE p_bonus_type
      WHEN 'free_spins' THEN 'Você recebeu ' || p_quantity || ' giro(s) grátis no Double no valor de R$ ' || p_value || ' cada!'
      WHEN 'cashback'   THEN 'Você recebeu R$ ' || p_value || ' de cashback na sua carteira!'
      WHEN 'double_xp'  THEN 'Seu XP foi dobrado pelo administrador! Continue jogando para subir de nível!'
    END,
    'bonus'
  );

  RETURN json_build_object('success', true, 'bonus_type', p_bonus_type, 'target_user', v_target_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
