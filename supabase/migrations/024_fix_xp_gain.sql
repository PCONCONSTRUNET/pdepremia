-- ============================================================
-- PREMIAJÁ — Migration 024: Fix XP Gain (Orders and Double)
-- ============================================================

-- 1. Create a reusable function to add XP to a user
CREATE OR REPLACE FUNCTION public.add_xp_to_user(p_user_id UUID, p_amount NUMERIC)
RETURNS void AS $$
DECLARE
    v_current_rank TEXT;
    v_current_level INTEGER;
    v_current_xp NUMERIC;
    v_xp_to_add NUMERIC;
    v_new_xp NUMERIC;
    v_levels_gained INTEGER;
    v_new_level INTEGER;
    v_new_rank TEXT;
BEGIN
    IF p_amount <= 0 THEN RETURN; END IF;

    -- Get current profile
    SELECT rank, COALESCE(rank_level, 1), COALESCE(xp, 0.00) 
    INTO v_current_rank, v_current_level, v_current_xp
    FROM public.profiles
    WHERE id = p_user_id;

    -- Calculate XP based on Rank
    IF v_current_rank = 'P Starter' THEN
        v_xp_to_add := p_amount / 1.0;  -- R$ 1 = 1 XP
    ELSIF v_current_rank = 'P Hunter' THEN
        v_xp_to_add := p_amount / 2.0;  -- R$ 2 = 1 XP
    ELSIF v_current_rank = 'P Master' THEN
        v_xp_to_add := p_amount / 5.0;  -- R$ 5 = 1 XP
    ELSIF v_current_rank = 'P Legend' THEN
        v_xp_to_add := p_amount / 10.0; -- R$ 10 = 1 XP
    ELSE
        v_xp_to_add := p_amount / 1.0;
    END IF;

    v_new_xp := v_current_xp + v_xp_to_add;
    v_levels_gained := FLOOR(v_new_xp / 100.0);
    v_new_xp := MOD(v_new_xp, 100.0);
    v_new_level := v_current_level + v_levels_gained;
    v_new_rank := COALESCE(v_current_rank, 'P Starter');

    -- Rank progression logic
    WHILE v_new_level > 5 LOOP
        IF v_new_rank = 'P Starter' THEN
            v_new_rank := 'P Hunter';
            v_new_level := v_new_level - 5;
        ELSIF v_new_rank = 'P Hunter' THEN
            v_new_rank := 'P Master';
            v_new_level := v_new_level - 5;
        ELSIF v_new_rank = 'P Master' THEN
            v_new_rank := 'P Legend';
            v_new_level := v_new_level - 5;
        ELSE
            -- P Legend capped at level 5
            v_new_rank := 'P Legend';
            v_new_level := 5;
            v_new_xp := 100.0; -- Maxed out
            EXIT;
        END IF;
    END LOOP;

    -- Update profile
    UPDATE public.profiles
    SET 
        xp = v_new_xp,
        rank_level = v_new_level,
        rank = v_new_rank,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Refactor the orders trigger to use the new function and handle INSERTS
CREATE OR REPLACE FUNCTION public.add_xp_from_order()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'paid' THEN
            PERFORM public.add_xp_to_user(NEW.user_id, NEW.total_amount);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
            PERFORM public.add_xp_to_user(NEW.user_id, NEW.total_amount);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_add_xp_from_order ON public.orders;
CREATE TRIGGER trigger_add_xp_from_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.add_xp_from_order();


-- 3. Modify place_double_bet to add XP
CREATE OR REPLACE FUNCTION public.place_double_bet(p_bet_amount numeric, p_target_color text)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_unix_time numeric;
  v_round_id bigint;
  v_phase_time int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_bet_amount <= 0 THEN RAISE EXCEPTION 'Bet amount must be greater than zero'; END IF;
  IF p_target_color NOT IN ('red', 'black', 'white') THEN RAISE EXCEPTION 'Invalid target color'; END IF;

  v_unix_time := extract(epoch from now());
  v_round_id := floor(v_unix_time / 15);
  v_phase_time := mod(v_unix_time::int, 15);

  -- Only allow bets during the first 10 seconds of the 15-second cycle
  IF v_phase_time >= 10 THEN
    RAISE EXCEPTION 'Apostas encerradas para esta rodada. Aguarde o próximo sorteio.';
  END IF;

  -- Lock and check balance
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance < p_bet_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Deduct bet amount immediately
  UPDATE public.profiles SET balance = balance - p_bet_amount WHERE id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status) 
  VALUES (v_user_id, -p_bet_amount, 'bet', 'completed');

  -- Record the bet
  INSERT INTO public.double_bets (user_id, round_id, amount, color, status)
  VALUES (v_user_id, v_round_id, p_bet_amount, p_target_color, 'pending');

  -- Get new balance
  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user_id;

  -- Add XP to user for playing!
  PERFORM public.add_xp_to_user(v_user_id, p_bet_amount);

  RETURN json_build_object(
    'round_id', v_round_id,
    'new_balance', v_balance,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
