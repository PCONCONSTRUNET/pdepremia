import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Gift, Hammer, Hash, Check } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatRelativeTime, maskName } from '@/lib/utils'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function usePublicWinners() {
  return useQuery({
    queryKey: ['winners', 'public-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, box:boxes(name), prize:prizes(name, prize_type, reference_value)')
        .eq('is_public', true)
        .order('won_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
}

function getTiers(value: number) {
  if (value >= 5000) return { user: 'PLATINA', prize: 'GRAND', color: 'pink' }
  if (value >= 500) return { user: 'OURO', prize: 'MAJOR', color: 'amber' }
  return { user: 'BRONZE', prize: 'MINOR', color: 'emerald' }
}

const colorStyles = {
  pink: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    text: 'text-pink-600',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
    shadow: 'shadow-[0_4px_20px_-4px_rgba(236,72,153,0.3)]'
  },
  amber: {
    bg: 'bg-white',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    text: 'text-amber-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    shadow: 'shadow-[0_4px_20px_-4px_rgba(251,191,36,0.3)]'
  },
  emerald: {
    bg: 'bg-white',
    border: 'border-emerald-200',
    dot: 'bg-emerald-400',
    text: 'text-emerald-600',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    shadow: 'shadow-sm'
  }
}

export default function Winners() {
  const { data: winners, isLoading } = usePublicWinners()
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    toast.success('Hash copiado!')
    setTimeout(() => setCopiedHash(null), 2000)
  }

  // Group winners by source/box
  const groupedWinners = winners?.reduce((acc, winner) => {
    const groupName = (winner as any).box?.name || 'Prêmios Diversos'
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(winner)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="min-h-screen py-12 px-4 bg-surface-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold-400 text-sm font-medium mb-2">🏆 Hall da Fama</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3">
            Ganhadores
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Cada prêmio registrado aqui é resultado de um processo transparente e auditável.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-12">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-8 w-64 bg-surface-800 rounded animate-pulse mb-4" />
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="min-w-[280px] h-[100px] bg-surface-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : winners && winners.length > 0 ? (
          <div className="space-y-12">
            {Object.entries(groupedWinners || {}).map(([groupName, groupWinners], idx) => (
              <div key={groupName}>
                {/* Group Title */}
                <div className="flex items-center gap-2 mb-4">
                  <Hammer size={20} className="text-slate-300" />
                  <h2 className="font-display font-bold text-white text-lg uppercase tracking-wide">
                    {groupName}
                  </h2>
                </div>

                {/* Horizontal Scroll Carousel */}
                <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide gap-4 snap-x">
                  {groupWinners.map((winner, i) => {
                    const value = (winner as any).prize?.reference_value || 0
                    const tier = getTiers(value)
                    const style = colorStyles[tier.color as keyof typeof colorStyles]

                    return (
                      <motion.div
                        key={winner.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`snap-start min-w-[280px] sm:min-w-[300px] shrink-0 p-4 rounded-2xl border ${style.bg} ${style.border} ${style.shadow} flex flex-col justify-between min-h-[120px] h-auto relative overflow-hidden`}
                      >
                        {/* Background watermark icon (optional but looks nice) */}
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] pointer-events-none">
                          <Gift size={80} className="text-slate-900" />
                        </div>

                        {/* Top row */}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                            <span className="font-bold text-slate-800 text-sm">{maskName(winner.display_name)}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${style.badgeBg} ${style.badgeText} tracking-wider`}>
                              {tier.user}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatRelativeTime(winner.won_at)}
                          </span>
                        </div>

                        {/* Hash Row */}
                        {(winner as any).audit_hash && (
                          <div className="flex items-center gap-1 mt-1 relative z-10">
                            <Hash size={10} className="text-slate-500" />
                            <button 
                              onClick={() => handleCopyHash((winner as any).audit_hash)}
                              className="text-[10px] text-slate-500 hover:text-slate-700 font-mono transition-colors flex items-center gap-1"
                              title="Copiar Hash do Sorteio"
                            >
                              {(winner as any).audit_hash.substring(0, 8)}...{(winner as any).audit_hash.slice(-8)}
                              {copiedHash === (winner as any).audit_hash ? <Check size={10} className="text-emerald-500" /> : null}
                            </button>
                          </div>
                        )}

                        {/* Bottom row */}
                        <div className="flex items-end justify-between relative z-10 mt-auto pt-3">
                          <div>
                            <p className="text-[11px] text-slate-500 mb-0.5 font-medium">ganhou</p>
                            <p className={`font-black text-lg ${style.text} tracking-tight leading-tight`}>
                              {(winner as any).prize?.prize_type === 'balance' || value > 0 
                                ? formatCurrency(value) 
                                : ((winner as any).prize?.name || 'Prêmio Misterioso')}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${style.badgeBg} ${style.badgeText} tracking-wider`}>
                            {tier.prize}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy size={28} />}
            title="Nenhum ganhador ainda"
            description="Os primeiros ganhadores aparecerão aqui após as aberturas de box iniciarem."
          />
        )}
      </div>
    </div>
  )
}

