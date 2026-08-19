-- ============================================================
-- PREMIAJÁ — Migration 011: User Rewards (Central de Recompensas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  image_url text,
  source text NOT NULL DEFAULT 'daily_wheel',
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_rewards_user_idx ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS user_rewards_status_idx ON public.user_rewards(status);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards" ON public.user_rewards 
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_user_reward(
  p_name text,
  p_category text,
  p_image_url text,
  p_source text DEFAULT 'daily_wheel'
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_reward_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_rewards (user_id, name, category, image_url, source)
  VALUES (v_user_id, p_name, p_category, p_image_url, p_source)
  RETURNING id INTO v_reward_id;

  RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.claim_user_reward(p_reward_id uuid)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.user_rewards
  SET status = 'claimed', claimed_at = now()
  WHERE id = p_reward_id AND user_id = v_user_id AND status = 'available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
