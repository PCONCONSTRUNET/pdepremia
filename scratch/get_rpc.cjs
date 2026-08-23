const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const query = `
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'redeem_promo_code';
  `;
  const res = await client.query(query);
  console.log(res.rows.map(r => r.pg_get_functiondef).join('\n\n'));
  await client.end();
}

run();
