import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:Lucasduda28123@db.kxinieyhslotcuhdfudp.supabase.co:5432/postgres'
})

async function run() {
  await client.connect()
  const res = await client.query(`
    SELECT id, email 
    FROM auth.users
  `)
  console.log(res.rows)
  await client.end()
}
run().catch(console.error)
