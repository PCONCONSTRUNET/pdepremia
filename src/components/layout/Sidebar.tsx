import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Gift, TrendingUp, Target, History, Flame, 
  Star, Gamepad2, PackageOpen, RotateCw, Ticket, Trophy
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuth } from '@/hooks/useAuth'

export function Sidebar() {
  const { isSidebarOpen } = useUIStore()
  const { isAuthenticated } = useAuth()

  const navItems = [
    {
      group: 'Originais',
      items: [
        { icon: History, label: 'Jogado Recentemente', to: '/perfil?tab=jogos', reqAuth: true },
        { icon: Flame, label: 'Double', to: '/double', reqAuth: false },
        { icon: RotateCw, label: 'Roleta Diária', to: '/roleta-diaria', reqAuth: true },
        { icon: PackageOpen, label: 'Mystery Box', to: '/boxes', reqAuth: false },
        { icon: Ticket, label: 'Sorteios', to: '/sorteios', reqAuth: false },
      ]
    },
    {
      group: 'Cassino',
      items: [
        { icon: Star, label: 'Favoritos', to: '/favoritos', reqAuth: true },
        { icon: Gamepad2, label: 'Todos os Jogos', to: '/', reqAuth: false },
      ]
    },
    {
      group: 'Pessoal',
      items: [
        { icon: Ticket, label: 'Meus Bilhetes', to: '/meus-bilhetes', reqAuth: true },
        { icon: Trophy, label: 'Meus Prêmios', to: '/perfil?tab=premios', reqAuth: true },
        { icon: Gift, label: 'Recompensas', to: '/perfil?tab=recompensas', reqAuth: true },
        { icon: TrendingUp, label: 'Progresso', to: '/ranks', reqAuth: true },
      ]
    }
  ]

  return (
    <motion.aside
      animate={{ 
        width: isSidebarOpen ? 240 : 64,
      }}
      transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
      className={`fixed left-0 top-[64px] bottom-0 z-30 bg-surface-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar overflow-x-hidden`}
    >
      <div className="flex-1 py-4 flex flex-col gap-6">
        {navItems.map((group, groupIdx) => {
          // Filter out items that require auth if user is not authenticated
          const visibleItems = group.items.filter(item => !item.reqAuth || isAuthenticated)
          
          if (visibleItems.length === 0) return null

          return (
            <div key={groupIdx} className="px-3 flex flex-col gap-1">
              {isSidebarOpen && (
                <div className="px-3 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {group.group}
                </div>
              )}
              {visibleItems.map((item, itemIdx) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.to}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                      ${isActive ? 'bg-brand-500/10 text-brand-400' : 'text-slate-400 hover:bg-surface-800 hover:text-white'}
                      ${!isSidebarOpen ? 'justify-center' : ''}
                    `}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon 
                          size={18} 
                          className={`shrink-0 transition-colors ${isActive ? 'text-brand-400' : 'group-hover:text-slate-300'}`} 
                        />
                        <span 
                          className={`whitespace-nowrap text-sm font-medium transition-opacity duration-200 ${
                            isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'
                          }`}
                        >
                          {item.label}
                        </span>
                        {isActive && isSidebarOpen && (
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 ml-auto" />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </div>
    </motion.aside>
  )
}
