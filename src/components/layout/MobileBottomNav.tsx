import { Link, useLocation } from 'react-router-dom'
import { Menu, Flame, PackageOpen, User } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'

export function MobileBottomNav() {
  const { toggleSidebar } = useUIStore()
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-900/95 backdrop-blur-xl border-t border-white/5 rounded-t-3xl flex items-center justify-around px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <motion.button 
        whileTap={{ scale: 0.85, y: 2 }}
        onClick={toggleSidebar}
        className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white transition-colors w-16"
      >
        <Menu size={22} />
        <span className="text-[10px] font-medium mt-1">Menu</span>
      </motion.button>

      <Link to="/double" className="w-16">
        <motion.div
          whileTap={{ scale: 0.85, y: 2 }}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/double') ? 'text-brand-400' : 'text-slate-400 hover:text-white'}`}
        >
          <Flame size={22} className={isActive('/double') ? 'fill-brand-400/20' : ''} />
          <span className="text-[10px] font-medium mt-1">Double</span>
        </motion.div>
      </Link>

      <Link to="/boxes" className="w-16">
        <motion.div
          whileTap={{ scale: 0.85, y: 2 }}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/boxes') ? 'text-brand-400' : 'text-slate-400 hover:text-white'}`}
        >
          <PackageOpen size={22} />
          <span className="text-[10px] font-medium mt-1">Box</span>
        </motion.div>
      </Link>

      <Link to={isAuthenticated ? "/perfil" : "/login"} className="w-16">
        <motion.div
          whileTap={{ scale: 0.85, y: 2 }}
          className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive('/perfil') ? 'text-brand-400' : 'text-slate-400 hover:text-white'}`}
        >
          <User size={22} />
          <span className="text-[10px] font-medium mt-1">Perfil</span>
        </motion.div>
      </Link>
    </div>
  )
}
