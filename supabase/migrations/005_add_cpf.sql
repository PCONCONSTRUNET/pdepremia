-- ============================================================
-- PREMIAJÁ — Migration 005: Add CPF column to profiles
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
