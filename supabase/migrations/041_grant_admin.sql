-- ============================================================
-- PREMIAJÁ — Migration 041: Grant Admin to pdepremia@gmail.com
-- ============================================================

UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'pdepremia@gmail.com';
