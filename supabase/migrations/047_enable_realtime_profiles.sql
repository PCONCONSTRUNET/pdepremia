-- ============================================================
-- PREMIAJÁ — Migration 047: Enable Realtime on Profiles
-- ============================================================
-- Ativa o Realtime (websockets) para a tabela profiles para
-- que novos usuários cadastrados apareçam automaticamente no painel admin
-- ============================================================

-- Ativar realtime na tabela profiles caso ainda não esteja ativado
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;