import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Lock, Zap, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface RankModalProps {
  isOpen: boolean
  onClose: () => void
}

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'P Hunter': return 'text-blue-500'
    case 'P Master': return 'text-purple-500'
    case 'P Legend': return 'text-amber-500'
    case 'P Starter':
    default:
      return 'text-emerald-500'
  }
}

const getRankBgColor = (rank: string) => {
  switch (rank) {
    case 'P Hunter': return 'bg-blue-500/10 border-blue-500/20'
    case 'P Master': return 'bg-purple-500/10 border-purple-500/20'
    case 'P Legend': return 'bg-amber-500/10 border-amber-500/20'
    case 'P Starter':
    default:
      return 'bg-emerald-500/10 border-emerald-500/20'
  }
}

const getRankIcon = (rank: string) => {
  switch (rank) {
    case 'P Hunter': return '/p-hunter.png'
    case 'P Master': return '/p-master.png'
    case 'P Legend': return '/p-legend.png'
    case 'P Starter':
    default:
      return '/p-starter.png'
  }
}

export function RankModal({ isOpen, onClose }: RankModalProps) {
  const { profile } = useAuth()
  
  // Como não há controle de level ainda, fixaremos em 1 para a estrutura visual
  const currentRank = profile?.rank || 'P Starter'
  const currentLevel = 1 
  const maxLevels = 5

  if (!isOpen && typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header com Brilho do Rank */}
            <div className={`p-6 border-b border-surface-800 text-center relative overflow-hidden ${getRankBgColor(currentRank)}`}>
              {/* Luz de Fundo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-current opacity-20 blur-[80px] pointer-events-none" />
              
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-32 h-32 mx-auto flex items-center justify-center mb-4 drop-shadow-2xl">
                  <img 
                    src={getRankIcon(currentRank)} 
                    alt={currentRank} 
                    className="w-full h-full object-contain drop-shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
                    }}
                  />
                </div>
                <h2 className={`text-2xl font-display font-bold ${getRankColor(currentRank)} drop-shadow-md`}>
                  {currentRank}
                </h2>
                <p className="text-sm font-medium text-slate-300 mt-1">
                  Nível {currentLevel}
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Barra de Progresso do Nível */}
              <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">Seu Progresso</span>
                  <span className="text-xs font-medium text-slate-400">Nível {currentLevel} de {maxLevels}</span>
                </div>
                
                <div className="relative">
                  {/* Trilha de fundo */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-800 -translate-y-1/2 z-0" />
                  
                  {/* Trilha preenchida */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-surface-700 to-white -translate-y-1/2 z-0 transition-all duration-1000"
                    style={{ width: `${((currentLevel - 1) / (maxLevels - 1)) * 100}%` }}
                  />

                  {/* Pontos de Nível */}
                  <div className="flex justify-between relative z-10">
                    {Array.from({ length: maxLevels }).map((_, idx) => {
                      const lvl = idx + 1
                      const isReached = lvl <= currentLevel
                      const isCurrent = lvl === currentLevel

                      return (
                        <div key={lvl} className="flex flex-col items-center gap-2">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg border-2 ${
                              isCurrent 
                                ? 'bg-surface-800 border-white text-white scale-110' 
                                : isReached 
                                  ? 'bg-surface-700 border-surface-600 text-slate-300' 
                                  : 'bg-surface-900 border-surface-800 text-slate-600'
                            }`}
                          >
                            {isReached ? <Star size={14} className={isCurrent ? 'fill-current' : ''} /> : <Lock size={12} />}
                          </div>
                          <span className={`text-[10px] font-bold ${isCurrent ? 'text-white' : isReached ? 'text-slate-400' : 'text-slate-600'}`}>
                            LVL {lvl}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-surface-800">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progresso Nível {currentLevel}</span>
                    <span className="text-sm font-bold text-brand-400">{Math.floor((profile as any)?.xp || 0)}% <span className="text-xs text-slate-500 font-normal">concluído</span></span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-900 rounded-full overflow-hidden border border-surface-700 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full relative" 
                      style={{ width: `${Math.min(100, Math.max(0, (profile as any)?.xp || 0))}%` }} 
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    A cada compra de bilhetes, você ganha XP e enche esta barra para subir de nível!
                  </p>
                </div>
              </div>

              {/* Benefícios */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Vantagens deste Nível</h3>
                
                <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-xl border border-surface-700">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Roleta Diária Base</p>
                    <p className="text-xs text-slate-400">Giro gratuito a cada 24 horas.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-xl border border-surface-700 opacity-50">
                  <div className="w-8 h-8 rounded-lg bg-surface-700 text-slate-500 flex items-center justify-center">
                    <Lock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Prêmios Aprimorados</p>
                    <p className="text-xs text-slate-500">Desbloqueado no nível superior.</p>
                  </div>
                </div>
              </div>

              {/* Link para página de Ranks */}
              <div className="mt-8 pt-6 border-t border-surface-800/50">
                <Link
                  to="/ranks"
                  onClick={onClose}
                  className="flex items-center justify-between w-full p-4 rounded-xl bg-surface-800/30 border border-surface-700/50 hover:bg-surface-700/50 hover:border-surface-600 transition-all group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Ver todos os Ranks</h4>
                    <p className="text-xs text-slate-400">Conheça os benefícios e prêmios de cada nível.</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
                </Link>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
