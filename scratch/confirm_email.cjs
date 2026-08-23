const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});
client.connect()
  .then(() => client.query("UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'pdepremia@gmail.com'"))
  .then(res => {
    console.log('Success confirmed email');
    client.end();
  })
  .catch(console.error);
