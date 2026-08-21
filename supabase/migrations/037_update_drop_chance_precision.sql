-- Update drop_chance column to support up to 4 decimal places
ALTER TABLE public.prizes ALTER COLUMN drop_chance TYPE numeric(8,4);
