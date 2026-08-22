import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { useUIStore } from '@/store/uiStore'
import { LiveChatWidget } from '@/components/support/LiveChatWidget'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function PublicLayout() {
  const { isSidebarOpen, setSidebarOpen } = useUIStore()
  const { profile } = useAuthStore()

  useEffect(() => {
    if (!profile?.id) return

    const subscription = supabase
      .channel('public:withdrawals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const newRow = payload.new
          const oldRow = payload.old

          if (oldRow.status !== 'approved' && newRow.status === 'approved') {
            toast.success('Seu saque foi aprovado!', {
              duration: 3000,
              icon: '🎉',
              style: {
                background: '#059669',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
              }
            })
          } else if (oldRow.status !== 'rejected' && newRow.status === 'rejected') {
            toast.error('Seu saque foi recusado. Verifique os detalhes.', {
              duration: 4000,
              style: {
                background: '#dc2626',
                color: '#fff',
                fontWeight: 'bold',
                borderRadius: '8px',
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [profile?.id])

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <main 
          className={`flex-1 transition-all duration-300 w-full pb-[80px] md:pb-0 ${isSidebarOpen ? 'md:pl-[240px]' : 'md:pl-[64px]'}`}
        >
          <Outlet />
          <Footer />
        </main>
      </div>
      <MobileBottomNav />
      <LiveChatWidget />
    </div>
  )
}
