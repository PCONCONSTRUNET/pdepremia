const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'promo_codes'::regclass
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
