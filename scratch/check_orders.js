const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});
client.connect()
  .then(() => client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='orders'"))
  .then(res => {
    console.log('Orders table exists:', res.rows.length > 0);
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
