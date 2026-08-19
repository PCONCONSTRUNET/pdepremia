-- Add thresholds to define how much R$ is needed to earn 1 spin on Wheel or Box
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS wheel_spin_threshold numeric(10,2),
  ADD COLUMN IF NOT EXISTS box_spin_threshold numeric(10,2);
