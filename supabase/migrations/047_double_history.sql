-- ============================================================
-- PREMIAJÁ — Migration 047: Double History RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_double_history(p_limit int DEFAULT 15)
RETURNS json AS $$
DECLARE
  v_unix_time numeric;
  v_current_round_id bigint;
  v_round_id bigint;
  v_server_seed text := 'premiaja_server_secret_v1_2026';
  v_client_seed text := '0000000000000000000PREMIAJA';
  v_message text;
  v_hash text;
  v_hex_snippet text;
  v_decimal bigint;
  v_result_num int;
  v_result_color text;
  v_results json[] := ARRAY[]::json[];
  v_round_duration int := 19;
BEGIN
  v_unix_time := extract(epoch from now());
  v_current_round_id := floor(v_unix_time / v_round_duration);

  -- We want the array to have the oldest round first, just like the frontend expects:
  -- The frontend slices the array and pushes to the end, so index 0 is oldest.
  -- To do this, we loop backwards from p_limit down to 1.
  FOR i IN REVERSE p_limit..1 LOOP
    v_round_id := v_current_round_id - i;
    
    v_message := v_client_seed || ':' || v_round_id;
    v_hash := encode(hmac(v_message::bytea, v_server_seed::bytea, 'sha256'), 'hex');
    v_hex_snippet := substring(v_hash from 1 for 8);
    v_decimal := ('x' || lpad(v_hex_snippet, 8, '0'))::bit(32)::bigint;
    v_result_num := v_decimal % 15;

    IF v_result_num = 0 THEN v_result_color := 'white';
    ELSIF v_result_num >= 1 AND v_result_num <= 7 THEN v_result_color := 'red';
    ELSE v_result_color := 'black';
    END IF;

    v_results := array_append(v_results, json_build_object(
      'roundId', v_round_id,
      'number', CASE WHEN v_result_num = 0 THEN 'W' ELSE v_result_num::text END,
      'color', v_result_color,
      'hash', v_hash,
      'timestamp', to_char(to_timestamp(v_round_id * v_round_duration), 'DD/MM/YYYY HH24:MI:SS')
    ));
  END LOOP;
  
  RETURN to_json(v_results);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
