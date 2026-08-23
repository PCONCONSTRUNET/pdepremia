const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});
client.connect()
  .then(() => client.query("SELECT id, email, encrypted_password FROM auth.users WHERE email = 'pdepremia@gmail.com'"))
  .then(res => {
    console.log(res.rows);
    client.end();
  })
  .catch(console.error);
