import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// Check if we are in the admin panel to use a separate session storage
const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: isAdminRoute ? 'sb-premia-admin-auth' : 'sb-premia-public-auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export default supabase
