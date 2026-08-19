import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { useUIStore } from '@/store/uiStore'

export function PublicLayout() {
  const { isSidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen flex flex-col bg-surface-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main 
          className="flex-1 transition-all duration-300 w-full"
          style={{ paddingLeft: isSidebarOpen ? 240 : 64 }}
        >
          <Outlet />
          <Footer />
        </main>
      </div>
    </div>
  )
}
