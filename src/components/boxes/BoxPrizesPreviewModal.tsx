import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, Sparkles, Coins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getPrizeImage } from '@/lib/utils'

function getRarity(dropChance: number) {

  if (dropChance <= 0.1) return { name: 'Mítico', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-400 border-red-500/20' }
  if (dropChance <= 1) return { name: 'Lendário', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/20' }
  if (dropChance <= 5) return { name: 'Épico', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/20' }
  if (dropChance <= 15) return { name: 'Raro', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/20' }
  return { name: 'Comum', color: 'text-slate-300', bg: 'bg-surface-800', border: 'border-surface-700', badge: 'bg-surface-700 text-slate-300 border-surface-600' }
}

interface BoxPrizesPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  box: any
}

export function BoxPrizesPreviewModal({ isOpen, onClose, box }: BoxPrizesPreviewModalProps) {
  const [showOdds, setShowOdds] = useState(false)
  
  const { data: prizes, isLoading } = useQuery({
    queryKey: ['public', 'box-prizes', box?.id],
    enabled: isOpen && Boolean(box?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('box_id', box!.id)
        .eq('status', 'active')
        .order('drop_chance', { ascending: false }) // Sort by most common first
      
      if (error) throw error
      return data
    }
  })

  return (
    <AnimatePresence>
      {isOpen && box && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-[#0F1317] border border-surface-700 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-surface-800 flex justify-between items-center bg-[#1A1F24]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400">
                    <Gift size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Conteúdo da {box.name}</h2>
                    <p className="text-sm text-slate-400">Veja o que você pode ganhar!</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">Odds</span>
                    <button
                      type="button"
                      onClick={() => setShowOdds(!showOdds)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showOdds ? 'bg-brand-500' : 'bg-surface-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showOdds ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </label>

                  <div className="w-px h-6 bg-surface-700 hidden sm:block" />

                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white transition-colors border border-transparent hover:border-surface-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : !prizes || prizes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    Nenhum prêmio configurado para esta caixa ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {prizes.map((prize: any) => {
                      const rarity = getRarity(Number(prize.drop_chance))
                      return (
                        <div 
                          key={prize.id} 
                          className={`bg-[#12161A] border ${rarity.border} rounded-xl sm:rounded-2xl p-2 sm:p-3 flex flex-col items-center text-center relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] shadow-lg`}
                        >
                          {/* Background Glow based on rarity */}
                          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 ${rarity.bg} rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity`} />

                          {/* Drop chance badge (Odds) */}
                          <AnimatePresence>
                            {showOdds && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={`absolute top-1 right-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded sm:rounded-md font-bold border ${rarity.badge} backdrop-blur-md z-20 flex items-center gap-1`}
                              >
                                {Number(prize.drop_chance)}%
                              </motion.div>
                            )}
                          </AnimatePresence>
                          
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1 sm:mb-2 mt-2 sm:mt-3 relative z-10">
                            {getPrizeImage(prize) ? (
                              <img 
                                src={getPrizeImage(prize)!} 
                                alt={prize.name} 
                                className="w-full h-full object-contain relative z-10 drop-shadow-lg hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full ${rarity.bg} flex items-center justify-center ${rarity.color} border border-white/5`}>
                                {prize.prize_type === 'box' && Number(prize.reference_value) > 0 ? (
                                  <Coins size={24} className="sm:w-8 sm:h-8" />
                                ) : (
                                  <Gift size={24} className="sm:w-8 sm:h-8" />
                                )}
                              </div>
                            )}
                          </div>
                          
                          <h4 className={`font-bold text-[10px] sm:text-xs line-clamp-2 leading-tight relative z-10 ${rarity.color}`}>
                            {prize.name}
                          </h4>
                          
                          <div className="mt-1 sm:mt-2 h-4 sm:h-5 flex items-center justify-center relative z-10">
                            {prize.prize_type === 'box' && prize.reference_value && Number(prize.reference_value) > 0 && (
                              <span className="text-emerald-400 bg-emerald-500/10 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border border-emerald-500/20 whitespace-nowrap">
                                {formatCurrency(prize.reference_value)}
                              </span>
                            )}
                            {prize.prize_type === 'double_spins' && (
                              <span className="text-brand-400 bg-brand-500/10 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border border-brand-500/20 whitespace-nowrap">
                                {prize.double_spins_count}x {Number(prize.double_spins_value).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
