-- 1. Update RPC to Place Bet (19 seconds total duration, 15s betting)
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
  v_round_id := floor(v_unix_time / 19);
  v_phase_time := mod(v_unix_time::int, 19);

  -- Only allow bets during the first 15 seconds of the 19-second cycle
  IF v_phase_time >= 15 THEN
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

  RETURN json_build_object(
    'round_id', v_round_id,
    'new_balance', v_balance,
    'status', 'success'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update RPC to Calculate Outcome & Resolve Bets
CREATE OR REPLACE FUNCTION public.get_double_result(p_round_id bigint)
RETURNS json AS $$
DECLARE
  v_unix_time numeric;
  v_current_round_id bigint;
  v_server_seed text := 'premiaja_server_secret_v1_2026';
  v_client_seed text := '0000000000000000000PREMIAJA';
  v_message text;
  v_hash text;
  v_hex_snippet text;
  v_decimal bigint;
  v_result_num int;
  v_result_color text;
  
  v_bet RECORD;
  v_win_multiplier int;
  v_won_amount numeric;
BEGIN
  v_unix_time := extract(epoch from now());
  v_current_round_id := floor(v_unix_time / 19);

  -- Ensure we don't reveal outcome before betting phase ends (time % 19 >= 15)
  IF p_round_id = v_current_round_id AND mod(v_unix_time::int, 19) < 15 THEN
    RAISE EXCEPTION 'A rodada ainda não terminou.';
  END IF;

  IF p_round_id > v_current_round_id THEN
    RAISE EXCEPTION 'A rodada informada ainda não aconteceu.';
  END IF;

  -- 1. Provably Fair Calculation
  v_message := v_client_seed || ':' || p_round_id;
  v_hash := encode(hmac(v_message::bytea, v_server_seed::bytea, 'sha256'), 'hex');
  v_hex_snippet := substring(v_hash from 1 for 8);
  
  -- Convert hex to int
  v_decimal := ('x' || lpad(v_hex_snippet, 8, '0'))::bit(32)::bigint;
  
  -- Sorteio (0-14) (MUST REMAIN 15!)
  v_result_num := v_decimal % 15;

  IF v_result_num = 0 THEN v_result_color := 'white';
  ELSIF v_result_num >= 1 AND v_result_num <= 7 THEN v_result_color := 'red';
  ELSE v_result_color := 'black';
  END IF;

  -- 2. Resolve ALL pending bets for THIS round!
  FOR v_bet IN 
    SELECT id, user_id, amount, color FROM public.double_bets 
    WHERE round_id = p_round_id AND status = 'pending' 
    FOR UPDATE
  LOOP
    IF v_bet.color = v_result_color THEN
      v_win_multiplier := CASE WHEN v_result_color = 'white' THEN 14 ELSE 2 END;
      v_won_amount := v_bet.amount * v_win_multiplier;
      
      UPDATE public.double_bets SET status = 'won' WHERE id = v_bet.id;
      UPDATE public.profiles SET balance = balance + v_won_amount WHERE id = v_bet.user_id;
      
      INSERT INTO public.wallet_transactions (user_id, amount, type, status) 
      VALUES (v_bet.user_id, v_won_amount, 'win', 'completed');
    ELSE
      UPDATE public.double_bets SET status = 'lost' WHERE id = v_bet.id;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'round_id', p_round_id,
    'result_number', v_result_num,
    'result_color', v_result_color,
    'hmac_hash', v_hash
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
