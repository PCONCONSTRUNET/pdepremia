-- ============================================================
-- PREMIAJÁ — Migration 022: Double Round Info
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_double_round_info(p_round_id bigint)
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
BEGIN
  v_unix_time := extract(epoch from now());
  v_current_round_id := floor(v_unix_time / 15);

  -- Only reveal if the round has finished
  IF p_round_id >= v_current_round_id THEN
    RAISE EXCEPTION 'A rodada ainda não terminou ou não existe.';
  END IF;

  v_message := v_client_seed || ':' || p_round_id;
  v_hash := encode(hmac(v_message::bytea, v_server_seed::bytea, 'sha256'), 'hex');
  v_hex_snippet := substring(v_hash from 1 for 8);
  v_decimal := ('x' || lpad(v_hex_snippet, 8, '0'))::bit(32)::bigint;
  v_result_num := v_decimal % 15;

  IF v_result_num = 0 THEN v_result_color := 'white';
  ELSIF v_result_num >= 1 AND v_result_num <= 7 THEN v_result_color := 'red';
  ELSE v_result_color := 'black';
  END IF;

  RETURN json_build_object(
    'round_id', p_round_id,
    'result_number', v_result_num,
    'result_color', v_result_color,
    'hmac_hash', v_hash,
    'timestamp', to_char(to_timestamp(p_round_id * 15), 'DD/MM/YYYY HH24:MI:SS')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
