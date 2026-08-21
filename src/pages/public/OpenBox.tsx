import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ArrowLeft, Trophy, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingPage } from '@/components/common/Loading'
import { getPrizeImage } from '@/lib/utils'
// @ts-ignore
import ReactConfetti from 'react-confetti'
import { useUIStore } from '@/store/uiStore'

// Helper to shuffle array
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export default function OpenBox() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setSpinningBox } = useUIStore()

  // Reset global spin state on unmount just in case
  useEffect(() => {
    return () => setSpinningBox(false)
  }, [])

  const [isSpinning, setIsSpinning] = useState(false)
  const [spinResult, setSpinResult] = useState<any>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  
  // Roulette state
  const [rouletteItems, setRouletteItems] = useState<any[]>([])
  const [translation, setTranslation] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  // 1. Fetch user box and its possible prizes
  const { data: userBox, isLoading, error } = useQuery({
    queryKey: ['userBox', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Pedido não encontrado')
      // Find the available user_box for this order OR user_box ID
      const { data: boxData, error: boxError } = await supabase
        .from('user_boxes')
        .select('*, box:boxes(*)')
        .or(`id.eq.${orderId},order_id.eq.${orderId}`)
        .eq('status', 'available')
        .limit(1)
        .single()
      
      if (boxError) {
        // Se não achou box available, talvez já foi aberta
        const { data: openedBox } = await supabase
          .from('user_boxes')
          .select('*, box:boxes(*)')
          .or(`id.eq.${orderId},order_id.eq.${orderId}`)
          .eq('status', 'opened')
          .limit(1)
          .single()
        
        if (openedBox) throw new Error('Esta box já foi aberta!')
        throw boxError
      }

      // Fetch prizes for this box (box prizes are infinite — no remaining filter)
      const { data: prizesData, error: prizesError } = await supabase
        .from('prizes')
        .select('*')
        .eq('box_id', boxData.box_definition_id)
        .eq('status', 'active')

      if (prizesError) throw prizesError

      return {
        userBox: boxData,
        prizes: prizesData || []
      }
    },
    retry: false
  })

  // Prepare roulette items with uniform distribution to maximize visual excitement
  // We avoid putting the exact same prize twice in a row so it looks diverse
  useEffect(() => {
    if (userBox) {
      const availablePrizes = userBox.prizes?.length > 0
        ? userBox.prizes
        : [{ id: 'dummy', name: 'Prêmio Surpresa', image_url: null, drop_chance: 10 }]

      const items = []
      let lastPrizeId = null
      
      for (let i = 0; i < 50; i++) {
        // Avoid consecutive duplicates if we have more than 1 prize option
        const candidates = availablePrizes.length > 1 
          ? availablePrizes.filter((p: any) => p.id !== lastPrizeId)
          : availablePrizes
          
        const randomIndex = Math.floor(Math.random() * candidates.length)
        const selected = candidates[randomIndex]
        
        items.push({ ...selected })
        lastPrizeId = selected.id
      }
      
      setRouletteItems(items)
    }
  }, [userBox])

  // --- Audio Helpers ---
  const playTickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05)
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05)
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.05)
    } catch (e) {}
  }

  const playWinSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(400, audioCtx.currentTime)
      osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.2)
      osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.4)
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5)
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 0.5)
    } catch (e) {}
  }

  const handleOpenBox = async () => {
    if (!userBox) return
    
    setIsSpinning(true)
    setSpinningBox(true)
    try {
      // 1. Call RPC to get real result
      const { data, error } = await supabase.rpc('open_box', {
        p_user_box_id: userBox.userBox.id
      })
      
      if (error) throw error

      const result = data as any
      setSpinResult(result)

      // Atualiza o cache do usuário em background para que a lista de boxes diminua na mesma hora
      queryClient.invalidateQueries({ queryKey: ['unopened_boxes'] })
      queryClient.invalidateQueries({ queryKey: ['prizes'] })

      // 2. Insert the winning prize at index 40
      const newItems = [...rouletteItems]
      // Garante que o array não seja esparso
      while (newItems.length <= 40) {
        newItems.push({ id: 'dummy', name: 'Prêmio Surpresa', image_url: null })
      }
      newItems[40] = {
        id: result.prize_id,
        name: result.prize_name,
        image_url: result.prize_image_url,
        reference_value: result.prize_value
      }
      setRouletteItems(newItems)

      // 3. Calculate translation
      // Item width is 160px (w-40) + 16px gap = 176px, box width = 160px
      const BOX_WIDTH = 160
      const GAP = 16
      const ITEM_WIDTH = BOX_WIDTH + GAP
      const TARGET_IDX = 40

      const containerEl = trackRef.current?.parentElement
      const containerWidth = containerEl?.clientWidth || window.innerWidth

      const targetX = (containerWidth / 2) - GAP - (TARGET_IDX * ITEM_WIDTH) - (BOX_WIDTH / 2)

      // Small delay to allow DOM to update before animating
      setTimeout(() => {
        setTranslation(targetX)

        // Simulate ticking sound during the 8s spin
        let currentTick = 0
        const tickLoop = () => {
          if (currentTick >= TARGET_IDX) {
            playWinSound()
            return
          }
          playTickSound()
          currentTick++
          
          // Easing approximation for the delay to slow down over time
          const progress = currentTick / TARGET_IDX
          const nextDelay = 20 + (Math.pow(progress, 3) * 650)
          
          setTimeout(tickLoop, nextDelay)
        }
        tickLoop()
      }, 100)

      // 4. Wait for animation to finish (8s)
      setTimeout(() => {
        setShowCelebration(true)
        setSpinningBox(false) // Resume balance animations after spin finishes
      }, 8500)

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao abrir a box')
      setIsSpinning(false)
      setSpinningBox(false)
    }
  }

  if (isLoading) return <LoadingPage message="Carregando sua Box..." />
  
  if (error) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4 text-center">
        <Trophy size={64} className="text-brand-500 mb-4 opacity-50" />
        <h1 className="text-white text-2xl font-bold mb-2">Ops!</h1>
        <p className="text-slate-400 mb-6">{error.message}</p>
        <Button variant="primary" onClick={() => navigate('/meus-premios')}>
          Ver meus prêmios
        </Button>
      </div>
    )
  }

  const box = userBox?.userBox.box

  return (
    <div className="min-h-screen bg-[#0f172a] overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft size={16} />}>
          Voltar
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Box Presentation (Before Spin) */}
        <AnimatePresence>
          {!isSpinning && !spinResult && (
            <motion.div 
              className="text-center flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            >
              <div className="w-48 h-48 mb-8 relative">
                <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full animate-pulse" />
                {box?.image_url ? (
                  <img src={box.image_url} alt={box.name} className="w-full h-full object-contain relative z-10 animate-float" />
                ) : (
                  <Gift size={120} className="text-brand-400 relative z-10" />
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 drop-shadow-lg">
                Sua {box?.name}
              </h1>
              <p className="text-slate-400 max-w-md mb-8">
                Esta box está pronta para ser aberta. Ela contém diversos prêmios valiosos. O que será que você vai tirar?
              </p>
              <Button 
                variant="gold" 
                size="xl" 
                className="w-full max-w-xs text-lg animate-pulse-glow"
                onClick={handleOpenBox}
              >
                Abrir Agora!
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Roulette UI */}
        <AnimatePresence>
          {isSpinning && (
            <motion.div 
              className="w-full absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1d]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Center Line Marker */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-gold-500 to-transparent z-20 -translate-x-1/2 shadow-[0_0_15px_rgba(234,179,8,1)]" />

              <div className="w-full overflow-hidden relative py-12 px-4 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] border-y border-surface-800">
                <div 
                  ref={trackRef}
                  className="flex gap-4"
                  style={{ 
                    transform: `translateX(${translation}px)`,
                    transition: isSpinning && translation !== 0 ? 'transform 8s cubic-bezier(0.15, 0.85, 0.15, 1)' : 'none',
                    willChange: 'transform'
                  }}
                >
                  {rouletteItems.map((item, index) => (
                    <div 
                      key={index}
                      className="w-40 h-40 shrink-0 bg-surface-800/80 rounded-2xl border border-surface-600/50 flex flex-col items-center justify-center p-4 relative overflow-hidden"
                    >
                      {index === 40 && spinResult && (
                        <div className="absolute inset-0 bg-gold-500/20 animate-pulse" />
                      )}
                      {getPrizeImage(item) ? (
                        <img src={getPrizeImage(item)} className="w-20 h-20 object-contain mb-3 drop-shadow-md z-10" />
                      ) : (
                        <Banknote size={40} className="text-emerald-400 mb-3 z-10" />
                      )}
                      <p className="text-xs font-semibold text-center text-white line-clamp-2 z-10">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && spinResult && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ReactConfetti 
              width={window.innerWidth} 
              height={window.innerHeight} 
              recycle={false} 
              numberOfPieces={500}
              gravity={0.15}
            />
            
            <motion.div 
              className="bg-surface-900 border border-gold-500/30 p-8 rounded-3xl max-w-sm w-full mx-4 text-center relative overflow-hidden"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 to-transparent pointer-events-none" />
              
              <h2 className="text-gold-400 font-bold text-xl mb-6">VOCÊ GANHOU!</h2>
              
              <div className="w-40 h-40 mx-auto flex items-center justify-center mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                {getPrizeImage({ image_url: spinResult.prize_image_url, name: spinResult.prize_name, prize_type: 'box', reference_value: spinResult.prize_value }) || getPrizeImage({ image_url: spinResult.prize_image_url, name: spinResult.prize_name, prize_type: 'double_spins' }) ? (
                  <img src={getPrizeImage({ image_url: spinResult.prize_image_url, name: spinResult.prize_name, prize_type: 'box', reference_value: spinResult.prize_value }) || getPrizeImage({ image_url: spinResult.prize_image_url, name: spinResult.prize_name, prize_type: 'double_spins' }) as string} className="w-full h-full object-contain" />
                ) : (
                  <Banknote size={64} className="text-emerald-400" />
                )}
              </div>
              
              <p className="text-white font-display font-bold text-2xl mb-2">{spinResult.prize_name}</p>
              {spinResult.prize_value && (
                <p className="text-emerald-400 font-medium mb-6">Valor: R$ {spinResult.prize_value.toFixed(2)}</p>
              )}
              
              <div className="flex justify-center">
                <Button 
                  variant="primary" 
                  className="w-[75%] !rounded-full"
                  onClick={() => navigate('/meus-premios')}
                >
                  Resgatar Prêmio
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
