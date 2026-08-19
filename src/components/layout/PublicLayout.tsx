import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { useUIStore } from '@/store/uiStore'

export function PublicLayout() {
  const { isSidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main 
          className={`flex-1 transition-all duration-300 w-full pb-[80px] md:pb-0 ${isSidebarOpen ? 'md:pl-[240px]' : 'md:pl-[64px]'}`}
        >
          <Outlet />
          <Footer />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
