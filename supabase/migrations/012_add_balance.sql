-- ============================================================
-- PREMIAJÁ — Migration 012: Add Balance to Profiles
-- ============================================================

-- Add balance column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric(10,2) NOT NULL DEFAULT 0.00;

-- Create RPC to add balance securely
CREATE OR REPLACE FUNCTION public.add_user_balance(amount numeric)
RETURNS void AS $$
BEGIN
  -- Only allow adding positive amounts to prevent abuse (withdrawals should be handled separately)
  IF amount <= 0 THEN
    RAISE EXCEPTION 'O valor a ser adicionado deve ser maior que zero.';
  END IF;

  UPDATE public.profiles
  SET balance = balance + amount,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
