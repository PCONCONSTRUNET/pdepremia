import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, CheckCircle2, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const RANKS_INFO = [
  {
    id: 'P Starter',
    name: 'P Starter',
    image: '/p-starter.png',
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    description: 'O início da sua jornada. Todo novo usuário começa aqui.',
    benefits: [
      'Acesso à Roleta Diária',
      'Compra de bilhetes padrão',
      'Suporte básico'
    ],
    levels: 5
  },
  {
    id: 'P Hunter',
    name: 'P Hunter',
    image: '/p-hunter.png',
    color: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Um caçador de prêmios nato. Você já sabe o que quer.',
    benefits: [
      'Roleta Diária Aprimorada',
      'Cashback de 1% em compras',
      'Suporte prioritário'
    ],
    levels: 5
  },
  {
    id: 'P Master',
    name: 'P Master',
    image: '/p-master.png',
    color: 'text-purple-500',
    bgLight: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'A elite dos jogadores. Você domina a plataforma.',
    benefits: [
      'Roleta Diária Master',
      'Cashback de 3% em compras',
      'Acesso antecipado a campanhas',
      'Atendimento VIP'
    ],
    levels: 5
  },
  {
    id: 'P Legend',
    name: 'P Legend',
    image: '/p-legend.png',
    color: 'text-amber-500',
    bgLight: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    description: 'Uma lenda viva. O mais alto prestígio do Premia Já.',
    benefits: [
      'Roleta Diária Legend (Prêmios Máximos)',
      'Cashback de 5% em compras',
      'Sorteios exclusivos para Legends',
      'Gerente de conta pessoal'
    ],
    levels: 5
  }
]

export default function Ranks() {
  const navigate = useNavigate()
  const { profile, isAuthenticated } = useAuth()
  
  const currentRank = profile?.rank || 'P Starter'
  const currentRankIndex = RANKS_INFO.findIndex(r => r.id === currentRank)
  const currentLevel = (profile as any)?.rank_level || 1
  
  // Calculate total progress percentage for the golden line
  // Each rank is a fraction of the total. 
  // Inside each rank, there are 5 levels.
  const totalRanks = RANKS_INFO.length
  const rankProgress = currentRankIndex / (totalRanks - 1)
  const levelProgress = ((currentLevel - 1) / 5) * (1 / (totalRanks - 1))
  const lineProgressPercentage = Math.min(100, Math.max(0, (rankProgress + levelProgress) * 100))

  return (
    <div className="min-h-screen bg-surface-950 pb-20 pt-24 lg:pt-32 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>

        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-medium text-sm mb-6"
          >
            Sistema de Prestígio
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-display font-bold text-white mb-4"
          >
            Conheça os Ranks
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-xl mx-auto text-lg"
          >
            Suba de nível, alcance novos Ranks e desbloqueie recompensas exclusivas, cashbacks e roletas com prêmios cada vez maiores.
          </motion.p>
        </div>

        <div className="relative pb-10">
          {/* Background Line */}
          <div className="absolute top-16 bottom-16 left-16 md:left-1/2 w-1 bg-surface-700/50 -translate-x-1/2 rounded-full" />
          
          {/* Golden Progress Line */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${lineProgressPercentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-16 left-16 md:left-1/2 w-1 bg-gradient-to-b from-brand-400 to-brand-600 -translate-x-1/2 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] z-0"
            style={{ maxHeight: 'calc(100% - 8rem)' }}
          />

          <div className="space-y-16 relative z-10">
          {RANKS_INFO.map((rank, index) => {
            const isUnlocked = index <= currentRankIndex
            const isCurrent = index === currentRankIndex

            return (
              <motion.div 
                key={rank.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Icon Marker */}
                <div className={`flex items-center justify-center w-32 h-32 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -translate-x-1/2 drop-shadow-2xl`}>
                  <img 
                    src={rank.image} 
                    alt={rank.name} 
                    className={`w-full h-full object-contain transition-all duration-300 ${!isUnlocked && !isCurrent ? 'grayscale opacity-40' : ''} ${isCurrent ? 'scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
                    }}
                  />
                  {/* Completed Checkmark */}
                  {isUnlocked && !isCurrent && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-surface-950 flex items-center justify-center text-white shadow-lg"
                    >
                      <CheckCircle2 size={16} className="text-white" />
                    </motion.div>
                  )}
                </div>

                {/* Card */}
                <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] p-6 bg-surface-900 border border-surface-800 rounded-3xl shadow-xl ml-auto md:ml-0 transition-transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-2xl font-display font-bold ${isUnlocked ? rank.color : 'text-slate-500'}`}>
                      {rank.name}
                    </h3>
                    {isCurrent && (
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-brand-500/10 text-brand-500 rounded-full border border-brand-500/20">
                        Seu Rank
                      </span>
                    )}
                    {!isUnlocked && (
                      <Lock size={20} className="text-slate-600" />
                    )}
                  </div>
                  
                  <p className="text-slate-400 mb-6">{rank.description}</p>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Benefícios:</h4>
                    <ul className="space-y-2">
                      {rank.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${isUnlocked ? rank.color : 'text-slate-600'}`} />
                          <span className={!isUnlocked ? 'text-slate-500' : ''}>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-6 border-t border-surface-800">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rank.levels }).map((_, i) => {
                        const isLevelUnlocked = isUnlocked && (!isCurrent || i < ((profile as any)?.rank_level || 1));
                        return (
                          <div 
                            key={i} 
                            className={`flex-1 h-1.5 rounded-full ${isLevelUnlocked ? rank.bgLight.replace('/10', '/50') : 'bg-surface-800'}`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-center">{rank.levels} Níveis de progressão</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Pronto para começar sua jornada?</h2>
            <Link to="/cadastro" className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-xl transition-colors">
              Criar Conta e Virar P Starter
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
