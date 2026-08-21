import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1]
const supabaseKey = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  // get a user who has a payment
  const { data: pay } = await supabase.from('payments').select('order_id, orders(user_id)').limit(1)
  if (!pay || pay.length === 0) return console.log('No payments')
  
  const userId = pay[0].orders.user_id
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, status, created_at, orders!inner(user_id)')
    .eq('orders.user_id', userId)
  console.log('Error:', error?.message)
  console.log('Data:', data?.length)
}

run()
