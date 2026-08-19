import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Gift, PackageOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { CardSkeleton } from '@/components/common/Loading'
import { BoxPurchaseModal } from '@/components/boxes/BoxPurchaseModal'

function usePublicBoxes() {
  return useQuery({
    queryKey: ['boxes', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

// Mapeamento de estilos visuais baseados no índice (para manter a estética)
const boxStyles = [
  { 
    color: 'text-slate-300', 
    bg: 'bg-slate-400/10',
    priceBg: 'bg-slate-500/10 border-slate-400/20',
    btn: 'bg-slate-700 hover:bg-slate-600 text-white'
  },
  { 
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10',
    priceBg: 'bg-blue-500/10 border-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
  },
  { 
    color: 'text-purple-400', 
    bg: 'bg-purple-400/10',
    priceBg: 'bg-purple-500/10 border-purple-500/20',
    btn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
  },
  { 
    color: 'text-gold-400', 
    bg: 'bg-gold-400/10',
    priceBg: 'bg-gold-500/10 border-gold-500/20',
    btn: 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
  },
]

export default function BoxesPage() {
  const { data: boxes, isLoading } = usePublicBoxes()
  const navigate = useNavigate()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedBox, setSelectedBox] = useState<any>(null)

  const handleBuyClick = (box: any) => {
    setSelectedBox(box)
    setShowPurchaseModal(true)
  }

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 min-h-screen bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-surface-950">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 -right-24 w-[500px] h-[500px] rounded-full bg-gold-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 -left-24 w-[500px] h-[500px] rounded-full bg-brand-500/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 text-gold-400 mb-6">
            <PackageOpen size={32} />
          </div>
          <h1 className="font-display font-bold text-white text-4xl sm:text-5xl mb-4">
            Nossas Boxes
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Escolha sua Box da Sorte e concorra a prêmios incríveis instantaneamente.
            Quanto mais rara a box, maiores as suas chances!
          </p>
        </div>

        {(!boxes || boxes.length === 0) ? (
          <div className="text-center py-20 glass rounded-3xl">
            <p className="text-slate-400">Nenhuma box disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boxes.map((box, i) => {
              const style = boxStyles[i % boxStyles.length]
              return (
                <motion.div
                  key={box.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="rounded-3xl overflow-hidden glass p-1 text-center group hover:scale-[1.02] transition-transform duration-300 flex flex-col h-full"
                >
                  <div className="rounded-2xl p-6 flex-1 flex flex-col border border-white/5 bg-surface-800/80 relative overflow-hidden">
                    <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-40 transition-opacity`} />
                    
                    <div className="flex justify-center mb-4 relative z-10">
                      <img src="/logo-rodape.png" alt="P DE PREMIA" className="h-8 w-auto object-contain opacity-80" />
                    </div>
                    
                    <div className="relative mb-6 flex justify-center mt-4">
                      <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
                        <div className={`absolute inset-0 ${style.bg} rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />
                        {box.image_url ? (
                          <img 
                            src={box.image_url} 
                            alt={box.name} 
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            className="w-full h-full object-contain relative z-10 drop-shadow-2xl group-hover:rotate-3 transition-transform select-none pointer-events-none"
                          />
                        ) : (
                          <Gift size={64} className={`${style.color} relative z-10`} />
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-auto relative z-10 flex flex-col items-center">
                      <h3 className={`font-display font-bold text-xl mb-2 ${style.color}`}>{box.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-3 mb-6 min-h-[40px]">{box.description}</p>
                      
                      <div className={`w-full ${style.priceBg} rounded-xl p-3 border mb-4`}>
                        <p className={`text-xs mb-0.5 opacity-80 ${style.color}`}>Valor da Box</p>
                        <p className={`font-display font-bold text-2xl ${style.color}`}>
                          {formatCurrency(box.price ?? 0)}
                        </p>
                      </div>

                      <button
                        className={`w-full py-3 rounded-xl text-base font-bold transition-all ${style.btn}`}
                        onClick={() => handleBuyClick(box)}
                      >
                        Comprar Box
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        <BoxPurchaseModal 
          isOpen={showPurchaseModal}
          onClose={() => {
            setShowPurchaseModal(false)
            setSelectedBox(null)
          }}
          box={selectedBox}
        />
      </div>
    </div>
  )
}
