import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Ticket, Trophy, Star, LogOut, User, LayoutDashboard, ChevronDown, Wallet, Plus, Gift, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/store/uiStore'
import { getInitials, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { DepositModal } from '@/components/wallet/DepositModal'
import { RankModal } from '@/components/rank/RankModal'
import { NotificationBell } from '@/components/common/NotificationBell'
import toast from 'react-hot-toast'

const navLinks = [
  { to: '/', label: 'Início' },
  { to: '/ganhadores', label: 'Ganhadores' },
  { to: '/transparencia', label: 'Transparência' },
  { to: '/double', label: 'Double' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-brand-400' : 'text-slate-400 hover:text-white'
  }`

const getMiniRankIcon = (rank: string) => {
  switch (rank) {
    case 'P Hunter': return '/p-hunter-mini.png'
    case 'P Master': return '/p-master-mini.png'
    case 'P Legend': return '/p-legend-mini.png'
    case 'P Starter':
    default:
      return '/p-starter-mini.png'
  }
}

export function Header() {
  const { isAuthenticated, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isRankModalOpen, setIsRankModalOpen] = useState(false)
  const { toggleSidebar, isSpinningBox } = useUIStore()

  // Balance Animation State
  const [displayedBalance, setDisplayedBalance] = useState((profile as any)?.balance || 0)
  const previousBalanceRef = useRef((profile as any)?.balance || 0)
  const [balanceAnimations, setBalanceAnimations] = useState<{id: number, diff: number}[]>([])

  // Sincroniza o saldo exibido, mas pausa durante o giro da Box
  useEffect(() => {
    if (profile && !isSpinningBox) {
      setDisplayedBalance((profile as any).balance || 0)
    }
  }, [profile?.balance, isSpinningBox])

  useEffect(() => {
    const currentBalance = displayedBalance
    const prevBalance = previousBalanceRef.current
    // Only animate if balance changed and prevBalance wasn't 0 (initial load)
    if (currentBalance !== prevBalance && prevBalance !== 0) {
      const diff = currentBalance - prevBalance
      const id = Date.now()
      setBalanceAnimations(prev => [...prev, { id, diff }])
      setTimeout(() => {
        setBalanceAnimations(prev => prev.filter(anim => anim.id !== id))
      }, 2500)
    }
    previousBalanceRef.current = currentBalance
  }, [displayedBalance])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Até logo!')
    navigate('/')
    setIsMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Menu Toggle */}
            <button 
              onClick={toggleSidebar}
              className="hidden md:flex p-2 -ml-2 text-slate-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors items-center justify-center mr-4"
            >
              <Menu size={24} />
            </button>
            
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img 
                src="/logo-rodape.png" 
                alt="P DE PREMIA" 
                className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
              />
            </Link>
          </div>

          {/* Desktop Nav - Oculto (movido para o rodapé a pedido) */}

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* Rank Button */}
                <button onClick={() => setIsRankModalOpen(true)} className="group outline-none">
                  <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-surface-700/60 border border-surface-600/50 hover:border-brand-500/50 transition-all cursor-pointer">
                    <div className="w-7 h-7 rounded-lg bg-surface-600 flex items-center justify-center text-white transition-colors overflow-hidden p-1 group-hover:bg-brand-500/20 group-hover:border-brand-500/50 border border-transparent">
                      <img 
                        src={getMiniRankIcon(profile?.rank || 'P Starter')} 
                        alt="Rank" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>';
                        }}
                      />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium leading-none mb-1">Nível {(profile as any)?.rank_level || 1}</span>
                      <span className="text-sm font-bold text-white leading-none">
                        {profile?.rank || 'P Starter'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Wallet Balance */}
                <button onClick={() => setIsDepositModalOpen(true)} className="group outline-none relative">
                  <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-surface-700/60 border border-surface-600/50 hover:border-brand-500/50 transition-all cursor-pointer relative">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium leading-none mb-1">Saldo</span>
                      <div className="relative">
                        <span className="text-sm font-bold text-emerald-400 leading-none">
                          {formatCurrency(displayedBalance)}
                        </span>
                        
                        <AnimatePresence>
                          {balanceAnimations.map((anim) => (
                            <motion.div
                              key={anim.id}
                              initial={{ opacity: 0, y: 0, scale: 0.5 }}
                              animate={{ opacity: 1, y: -25, scale: 1 }}
                              exit={{ opacity: 0, y: -40 }}
                              className={`absolute right-0 top-0 font-bold whitespace-nowrap z-50 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${anim.diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                            >
                              {anim.diff > 0 ? '+' : ''}{formatCurrency(anim.diff)}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-surface-600 group-hover:bg-brand-500 flex items-center justify-center text-white transition-colors">
                      <Plus size={16} />
                    </div>
                  </div>
                </button>

                {/* Profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-surface-700/60 border border-surface-600/50 hover:border-brand-500/30 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
                      {getInitials(profile?.full_name || 'U')}
                    </div>
                    <span className="text-slate-300 text-sm font-medium max-w-[100px] truncate">
                      {profile?.full_name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-52 bg-surface-800 border border-surface-600/50 rounded-xl shadow-xl z-20 overflow-hidden"
                        >
                          <div className="p-3 border-b border-surface-700/50">
                            <p className="text-white text-sm font-medium truncate mb-2">{profile?.full_name}</p>
                            <div className="w-full">
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[10px] uppercase text-slate-400 font-medium tracking-wider">XP Nível {(profile as any)?.rank_level || 1}</span>
                                <span className="text-[10px] font-bold text-brand-400">{Math.floor((profile as any)?.xp || 0)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-surface-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full" 
                                  style={{ width: `${Math.min(100, Math.max(0, (profile as any)?.xp || 0))}%` }} 
                                />
                              </div>
                            </div>
                          </div>
                          <div className="p-1">
                            <Link
                              to="/perfil"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-lg text-sm transition-colors"
                            >
                              <User size={15} />
                              Meu Perfil
                            </Link>
                            <Link
                              to="/meus-premios"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-lg text-sm transition-colors"
                            >
                              <Trophy size={15} />
                              Meus Prêmios
                            </Link>
                            <Link
                              to="/recompensas"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 rounded-lg text-sm transition-colors"
                            >
                              <Gift size={15} />
                              Recompensas
                            </Link>
                            <Link
                              to="/perfil?tab=saque"
                              onClick={() => setIsProfileOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-lg text-sm transition-colors"
                            >
                              <Wallet size={15} />
                              Saque
                            </Link>

                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                            >
                              <LogOut size={15} />
                              Sair
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="hidden lg:flex">
                    Entrar
                  </Button>
                </Link>
                <Link to="/cadastro">
                  <Button variant="primary" size="sm">
                    Criar Conta
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && (
              <>
                <button onClick={() => setIsDepositModalOpen(true)} className="group outline-none relative mr-1">
                  <div className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-surface-700/60 border border-surface-600/50 hover:border-brand-500/50 transition-all cursor-pointer">
                    <div className="relative">
                      <span className="text-xs font-bold text-emerald-400 leading-none">
                        {formatCurrency(displayedBalance)}
                      </span>
                      <AnimatePresence>
                        {balanceAnimations.map((anim) => (
                          <motion.div
                            key={anim.id}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -20, scale: 1 }}
                            exit={{ opacity: 0, y: -30 }}
                            className={`absolute right-0 top-0 font-bold whitespace-nowrap z-50 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${anim.diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {anim.diff > 0 ? '+' : ''}{formatCurrency(anim.diff)}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="w-5 h-5 rounded bg-surface-600 group-hover:bg-brand-500 flex items-center justify-center text-white transition-colors">
                      <Plus size={12} />
                    </div>
                  </div>
                </button>
                <NotificationBell />
              </>
            )}
            <button
              className="text-slate-400 hover:text-white transition-colors p-1"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Perfil"
            >
              {isMobileOpen ? <X size={22} /> : <User size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 top-[60px] w-[260px] bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl z-50 overflow-hidden md:hidden"
            >
              <div className="px-3 py-3 space-y-1">
                {isAuthenticated ? (
                  <>
                    {/* Rank Mobile */}
                    <button 
                      onClick={() => { setIsMobileOpen(false); setIsRankModalOpen(true); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50 hover:border-brand-500/50 transition-all mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center p-1.5">
                          <img 
                            src={getMiniRankIcon(profile?.rank || 'P Starter')} 
                            alt="Rank" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium leading-none mb-1">Nível 1</span>
                          <span className="text-sm font-bold text-white leading-none">
                            {profile?.rank || 'P Starter'}
                          </span>
                        </div>
                      </div>
                      <ChevronDown size={16} className="text-slate-500 -rotate-90" />
                    </button>

                    {/* Wallet Mobile */}
                    <div className="flex items-center justify-between px-3 py-3 mb-2 bg-surface-700/30 rounded-xl border border-surface-600/50">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium">Seu Saldo</span>
                        <span className="text-emerald-400 font-bold tracking-tight">
                          {formatCurrency(displayedBalance)}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setIsMobileOpen(false)
                          setIsDepositModalOpen(true)
                        }}
                        className="outline-none"
                      >
                        <div className="w-8 h-8 rounded-lg bg-surface-600 hover:bg-brand-500 flex items-center justify-center text-white transition-colors">
                          <Plus size={18} />
                        </div>
                      </button>
                    </div>
                    
                    <NavLink
                      to="/perfil"
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-xl text-sm"
                    >
                      <User size={16} />
                      Meu Perfil
                    </NavLink>
                    <NavLink
                      to="/meus-premios"
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-xl text-sm"
                    >
                      <Trophy size={16} />
                      Meus Prêmios
                    </NavLink>
                    <NavLink
                      to="/perfil?tab=recompensas"
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-brand-400 hover:bg-brand-500/10 rounded-xl text-sm"
                    >
                      <Gift size={16} />
                      Recompensas
                    </NavLink>
                    <NavLink
                      to="/perfil?tab=saque"
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-slate-300 hover:text-white hover:bg-surface-700/50 rounded-xl text-sm"
                    >
                      <Wallet size={16} />
                      Saque
                    </NavLink>
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-brand-400 hover:bg-brand-500/10 rounded-xl text-sm"
                      >
                        <LayoutDashboard size={16} />
                        Painel Admin
                      </NavLink>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-sm"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 pt-1">
                    <Link to="/login" onClick={() => setIsMobileOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Entrar na Conta
                      </Button>
                    </Link>
                    <Link to="/cadastro" onClick={() => setIsMobileOpen(false)}>
                      <Button variant="primary" className="w-full">
                        Criar Conta
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => setIsDepositModalOpen(false)} 
      />
      <RankModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
      />
    </header>
  )
}
