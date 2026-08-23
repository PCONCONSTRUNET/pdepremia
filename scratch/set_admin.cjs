const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
});

client.connect().then(() => {
  return client.query(`
    UPDATE auth.users 
    SET encrypted_password = crypt('admin123', gen_salt('bf')) 
    WHERE email = 'pdepremia@gmail.com';
    
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE email = 'pdepremia@gmail.com';
  `);
}).then(res => {
  console.log('success');
  client.end();
}).catch(e => {
  console.error(e);
  client.end();
});
