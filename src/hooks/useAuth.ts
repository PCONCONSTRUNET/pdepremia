import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Profile } from '@/types'

export function useAuth() {
  const {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    setUser,
    setSession,
    setProfile,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore()

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  }, [])

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let activeProfile = null
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile?.status === 'banned') {
          await supabase.auth.signOut()
          reset()
          setLoading(false)
          setInitialized(true)
          return
        }
        activeProfile = profile
      }

      setSession(session)
      setUser(session?.user ?? null)
      setProfile(activeProfile)
      setLoading(false)
      setInitialized(true)
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      let activeProfile = null
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (profile?.status === 'banned') {
          await supabase.auth.signOut()
          reset()
          setLoading(false)
          return
        }
        activeProfile = profile
      }

      setSession(session)
      setUser(session?.user ?? null)
      setProfile(activeProfile)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, setInitialized, setLoading, setProfile, setSession, setUser, reset, user?.id])

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    reset()
  }

  const isAdmin = profile?.role === 'admin'
  const isOperator = profile?.role === 'operator' || isAdmin
  const isAuthenticated = !!session && !!user

  return {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated,
    isAdmin,
    isOperator,
    signOut,
    fetchProfile,
  }
}
