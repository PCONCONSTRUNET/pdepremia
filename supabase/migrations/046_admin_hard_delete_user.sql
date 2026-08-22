-- ============================================================
-- PREMIAJÁ — Migration 046: Admin Hard Delete User
-- ============================================================
-- Cria a função admin_hard_delete_user que apaga completamente
-- um usuário e todos os seus dados do sistema.
-- SOMENTE o admin pdepremia@gmail.com pode executar.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(p_target_user_id uuid)
RETURNS json AS $$
DECLARE
  v_caller_id uuid;
  v_caller_email text;
  v_caller_role text;
  v_target_name text;
  v_target_email text;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Verificar identidade e permissão do caller
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;

  -- SEGURANÇA: Somente o admin master (pdepremia@gmail.com) pode deletar usuários
  IF v_caller_email IS DISTINCT FROM 'pdepremia@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado. Apenas o administrador master pode excluir usuários permanentemente.';
  END IF;

  IF v_caller_role NOT IN ('admin', 'operator') THEN
    RAISE EXCEPTION 'Acesso negado. Função requer role de admin.';
  END IF;

  -- 2. Não permitir auto-exclusão
  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta pelo painel.';
  END IF;

  -- 3. Buscar dados do usuário alvo
  SELECT full_name INTO v_target_name FROM public.profiles WHERE id = p_target_user_id;
  SELECT email INTO v_target_email FROM auth.users WHERE id = p_target_user_id;

  IF v_target_name IS NULL AND v_target_email IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado no sistema.';
  END IF;

  -- 4. Bloquear exclusão de outros admins
  PERFORM 1 FROM public.profiles WHERE id = p_target_user_id AND role = 'admin';
  IF FOUND THEN
    RAISE EXCEPTION 'Não é possível excluir um usuário com role de admin.';
  END IF;

  -- 5. Registrar na auditoria ANTES de deletar (último registro)
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, metadata)
  VALUES (
    v_caller_id,
    'ADMIN_HARD_DELETE_USER',
    'profiles',
    p_target_user_id,
    jsonb_build_object(
      'deleted_user_name', v_target_name,
      'deleted_user_email', v_target_email,
      'deleted_by_email', v_caller_email,
      'deleted_at', now()
    )
  );

  -- 6. Deletar dados vinculados em ordem segura (respeitar FKs)

  -- Mensagens de suporte
  DELETE FROM public.support_messages WHERE sender_id = p_target_user_id;
  DELETE FROM public.support_conversations WHERE user_id = p_target_user_id;

  -- Notificações
  DELETE FROM public.notifications WHERE user_id = p_target_user_id;

  -- Recompensas
  DELETE FROM public.user_rewards WHERE user_id = p_target_user_id;

  -- Sorteios (winner entries)
  DELETE FROM public.winners WHERE user_id = p_target_user_id;

  -- Double bets
  DELETE FROM public.double_bets WHERE user_id = p_target_user_id;

  -- Roleta diária
  DELETE FROM public.user_wheel_spins WHERE user_id = p_target_user_id;

  -- Caixas do usuário
  DELETE FROM public.user_boxes WHERE user_id = p_target_user_id;

  -- Bilhetes
  DELETE FROM public.tickets WHERE user_id = p_target_user_id;

  -- Transações de carteira
  DELETE FROM public.wallet_transactions WHERE user_id = p_target_user_id;

  -- Saques
  DELETE FROM public.withdrawals WHERE user_id = p_target_user_id;

  -- Pagamentos (via orders)
  DELETE FROM public.payments WHERE order_id IN (
    SELECT id FROM public.orders WHERE user_id = p_target_user_id
  );

  -- Pedidos
  DELETE FROM public.orders WHERE user_id = p_target_user_id;

  -- Draws vinculados ao usuário
  UPDATE public.draws SET winner_user_id = NULL WHERE winner_user_id = p_target_user_id;

  -- Perfil (ON DELETE CASCADE de auth.users também cuida disso, mas por segurança)
  DELETE FROM public.profiles WHERE id = p_target_user_id;

  -- 7. Deletar da auth.users (cascata automática para profiles se restou algo)
  DELETE FROM auth.users WHERE id = p_target_user_id;

  RETURN json_build_object(
    'success', true,
    'deleted_user', v_target_name,
    'deleted_email', v_target_email,
    'message', 'Usuário excluído permanentemente do sistema.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apenas autenticados podem tentar chamar (a verificação interna bloqueia não-admins)
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(uuid) TO authenticated;
