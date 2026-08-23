const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE promo_codes DROP CONSTRAINT promo_codes_reward_type_check;
      ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_reward_type_check 
      CHECK (reward_type = ANY (ARRAY['xp_multiplier'::text, 'roulette'::text, 'daily_spin'::text, 'box'::text, 'cashback'::text, 'balance'::text]));
    `);
    console.log("Constraint updated successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
