const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.spin_daily_wheel()
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_user_id uuid;
        v_deposit_count integer;
        v_profile record;
        v_config jsonb;
        v_prizes jsonb;
        v_prize_count integer;
        v_random_index integer;
        v_selected_prize jsonb;
        v_total_weight numeric := 0;
        v_rand numeric;
        v_cumulative numeric := 0;
        v_i integer;
        v_prize jsonb;
        v_using_promo_spin boolean := false;
      BEGIN
        v_user_id := auth.uid();
        IF v_user_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

        -- Bloqueia o perfil para leitura/edição
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE id = v_user_id FOR UPDATE;

        -- 1. Verifica se tem giro promocional
        IF v_profile.available_promo_spins > 0 THEN
            v_using_promo_spin := true;
        ELSE
            -- 1. Check eligibility (Deposit in last 14 days)
            SELECT COUNT(*) INTO v_deposit_count 
            FROM public.payments 
            WHERE user_id = v_user_id 
              AND status = 'approved' 
              AND created_at >= NOW() - INTERVAL '14 days';

            IF v_deposit_count = 0 THEN
              RAISE EXCEPTION 'Você precisa ter feito pelo menos um depósito nos últimos 14 dias para girar a roleta.';
            END IF;

            -- 2. Check cooldown
            IF v_profile.last_daily_spin IS NOT NULL AND v_profile.last_daily_spin > NOW() - INTERVAL '24 hours' THEN
              RAISE EXCEPTION 'Você já girou a roleta hoje. Volte em 24h!';
            END IF;
        END IF;

        -- 3. Get prizes config based on rank
        SELECT value INTO v_config 
        FROM public.system_settings 
        WHERE key = 'daily_wheel_prizes';

        IF v_config IS NULL THEN
          v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0, "probability": 100}]'::jsonb;
        ELSE
          -- Try to get rank-specific array, fallback to default or first array found
          v_prizes := v_config->(COALESCE(v_profile.rank, 'P Starter'));
          IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
            -- Try P Starter as fallback
            v_prizes := v_config->'P Starter';
            IF v_prizes IS NULL OR jsonb_array_length(v_prizes) = 0 THEN
              v_prizes := '[{"name": "Vazio", "type": "empty", "value": 0, "probability": 100}]'::jsonb;
            END IF;
          END IF;
        END IF;

        -- 4. Pick random prize based on strict probability weights
        v_prize_count := jsonb_array_length(v_prizes);
        
        -- Calcular soma total das probabilidades
        FOR v_i IN 0 .. v_prize_count - 1 LOOP
          v_prize := v_prizes->v_i;
          v_total_weight := v_total_weight + COALESCE((v_prize->>'probability')::numeric, 0);
        END LOOP;

        IF v_total_weight <= 0 THEN
          -- Fallback to first prize if all weights are 0
          v_random_index := 0;
          v_selected_prize := v_prizes->0;
        ELSE
          v_rand := random() * v_total_weight;
          
          FOR v_i IN 0 .. v_prize_count - 1 LOOP
            v_prize := v_prizes->v_i;
            v_cumulative := v_cumulative + COALESCE((v_prize->>'probability')::numeric, 0);
            IF v_rand <= v_cumulative THEN
              v_random_index := v_i;
              v_selected_prize := v_prize;
              EXIT;
            END IF;
          END LOOP;
        END IF;
        
        -- Prevenção de segurança extra
        IF v_selected_prize IS NULL THEN
            v_random_index := 0;
            v_selected_prize := v_prizes->0;
        END IF;

        -- 5. Process Reward
        IF (v_selected_prize->>'type') = 'balance' AND (v_selected_prize->>'value')::numeric > 0 THEN
          -- Add balance
          UPDATE public.profiles 
          SET balance = balance + (v_selected_prize->>'value')::numeric 
          WHERE id = v_user_id;
          
          INSERT INTO public.wallet_transactions (user_id, amount, type, status) 
          VALUES (v_user_id, (v_selected_prize->>'value')::numeric, 'prize', 'completed');
        ELSIF (v_selected_prize->>'type') != 'empty' THEN
          -- Add virtual reward
          INSERT INTO public.user_rewards (user_id, name, category, image_url, source)
          VALUES (v_user_id, v_selected_prize->>'name', COALESCE(v_selected_prize->>'category', 'Geral'), v_selected_prize->>'imageUrl', 'daily_wheel');
        END IF;

        -- 6. Update cooldown and available spins
        IF v_using_promo_spin THEN
            UPDATE public.profiles 
            SET available_promo_spins = available_promo_spins - 1
            WHERE id = v_user_id;
        ELSE
            UPDATE public.profiles 
            SET last_daily_spin = NOW() 
            WHERE id = v_user_id;
        END IF;

        -- 7. Return selected prize info so frontend can animate
        RETURN json_build_object(
          'success', true,
          'prize_index', v_random_index,
          'prize', v_selected_prize
        );
      END;
      $$;
    `);
    console.log("Function updated successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
