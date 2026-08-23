const fs = require('fs');
const { Client } = require('pg');

const sql = fs.readFileSync('scratch/create_affiliate_referrals_rpc.sql', 'utf8');

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

client.connect()
  .then(() => client.query(sql))
  .then(() => {
    console.log('RPC applied successfully');
    client.end();
  })
  .catch(e => {
    console.error(e);
    client.end();
  });
