import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kxinieyhslotcuhdfudp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4aW5pZXloc2xvdGN1aGRmdWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzQ0MjIsImV4cCI6MjEwMTk1MDQyMn0.oqG9-aqZwseVI4lFL4QCL7S9cK1G8itlPMkRa89Hk1I'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const { data: boxes } = await supabase.from('boxes').select('*').order('price', { ascending: true })
  console.log('Boxes count:', boxes?.length)
  console.log('Boxes:', boxes)
}

main()
