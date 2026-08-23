const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const hash = bcrypt.hashSync('admin123', 10);

const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

client.connect()
  .then(() => client.query(`UPDATE auth.users SET encrypted_password = $1 WHERE email = 'pdepremia@gmail.com'`, [hash]))
  .then(res => {
    console.log('Success bcrypt password');
    client.end();
  })
  .catch(console.error);
