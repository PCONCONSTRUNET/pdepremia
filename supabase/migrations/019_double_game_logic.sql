-- ============================================================
-- PREMIAJÁ — Migration 019: Double Game Logic
-- ============================================================

-- 1. Add 'bet' and 'win' to the allowed types in wallet_transactions
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'admin_bonus', 'promo_code', 'bet', 'win'));

-- 2. Create the Double Game RPC
CREATE OR REPLACE FUNCTION public.play_double(p_bet_amount numeric, p_target_color text)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_random_num int;
  v_result_color text;
  v_win_multiplier int;
  v_won_amount numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_bet_amount <= 0 THEN
    RAISE EXCEPTION 'Bet amount must be greater than zero';
  END IF;

  IF p_target_color NOT IN ('red', 'black', 'white') THEN
    RAISE EXCEPTION 'Invalid target color';
  END IF;

  -- Lock and check balance
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct bet amount immediately
  UPDATE public.profiles SET balance = balance - p_bet_amount WHERE id = v_user_id;

  -- Insert wallet transaction for the bet deduction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status)
  VALUES (v_user_id, -p_bet_amount, 'bet', 'completed');

  -- Generate random outcome (0 to 14)
  -- White = 0
  -- Red = 1 to 7
  -- Black = 8 to 14
  v_random_num := floor(random() * 15);

  IF v_random_num = 0 THEN
    v_result_color := 'white';
    v_win_multiplier := 18;
  ELSIF v_random_num >= 1 AND v_random_num <= 7 THEN
    v_result_color := 'red';
    v_win_multiplier := 2;
  ELSE
    v_result_color := 'black';
    v_win_multiplier := 2;
  END IF;

  v_won_amount := 0;

  -- Check if win
  IF v_result_color = p_target_color THEN
    v_won_amount := p_bet_amount * v_win_multiplier;
    
    -- Credit winnings
    UPDATE public.profiles SET balance = balance + v_won_amount WHERE id = v_user_id;

    -- Insert wallet transaction for winnings
    INSERT INTO public.wallet_transactions (user_id, amount, type, status)
    VALUES (v_user_id, v_won_amount, 'win', 'completed');
  END IF;

  -- Get new balance
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id;

  RETURN json_build_object(
    'result_number', v_random_num,
    'result_color', v_result_color,
    'won_amount', v_won_amount,
    'new_balance', v_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
