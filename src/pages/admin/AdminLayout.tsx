import { useState } from 'react'
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Megaphone, ShoppingCart, CreditCard, Ticket, Trophy,
  Package, Disc3, Users, ClipboardList, Settings, LogOut, Menu, X,
  Star, ChevronRight, Gift, Shield, Wallet
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
  { to: '/admin/saques', label: 'Saques', icon: <Wallet size={18} /> },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: <CreditCard size={18} /> },
  { to: '/admin/sorteios', label: 'Sorteios', icon: <Megaphone size={18} /> },
  { to: '/admin/recompensas', label: 'Recompensas', icon: <Ticket size={18} /> },
  { to: '/admin/ganhadores', label: 'Ganhadores', icon: <Trophy size={18} /> },

  { to: '/admin/roleta-diaria', label: 'Roleta Diária', icon: <Disc3 size={18} /> },
  { to: '/admin/boxes', label: 'Boxes', icon: <Package size={18} /> },
  { to: '/admin/usuarios', label: 'Usuários', icon: <Users size={18} /> },
  { to: '/admin/auditoria', label: 'Auditoria', icon: <Shield size={18} /> },
  { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={18} /> },
]

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Saiu com sucesso')
    navigate('/')
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/20'
        : 'text-slate-400 hover:text-white hover:bg-surface-700/50'
    }`

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        {/* Usamos <a> em vez de <Link> para forçar um recarregamento da página. Isso é necessário para
            re-inicializar o Supabase client com o storageKey correto (Public x Admin) */}
        <a href="/" className="flex items-center gap-2.5">
          <div>
            <img 
              src="/logo-rodape.png" 
              alt="P DE PREMIA" 
              className="h-8 w-auto object-contain" 
            />
            <span className="block text-xs text-slate-500 mt-1">Painel Admin</span>
          </div>
        </a>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClass}
            onClick={onClose}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Profile */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-700/30 mb-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {getInitials(profile?.full_name || 'A')}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-slate-500 text-xs capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-sm transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-surface-900 border-r border-white/5 flex-col h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-surface-950/80 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 bg-surface-900 border-r border-white/5 flex flex-col lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-surface-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-white/5 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-1"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <Star size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm">P DE PREMIA</span>
          </Link>
          <div className="w-8" />
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
