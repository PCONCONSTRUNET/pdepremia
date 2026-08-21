import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Star } from 'lucide-react'

export function LevelUpOverlay() {
  const { profile } = useAuth()
  // Tratamos o rank_level, caso não exista, assume 1
  const currentLevel = (profile as any)?.rank_level || 1
  const prevLevelRef = useRef(currentLevel)
  const [showAnimation, setShowAnimation] = useState(false)
  const [leveledUpTo, setLeveledUpTo] = useState(currentLevel)

  useEffect(() => {
    // Apenas animar se o profile estiver carregado e o rank_level atual for maior que o salvo
    if (profile && currentLevel > prevLevelRef.current && prevLevelRef.current > 0) {
      setLeveledUpTo(currentLevel)
      setShowAnimation(true)
      
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setShowAnimation(false)
      }, 5000)
      
      prevLevelRef.current = currentLevel
      return () => clearTimeout(timer)
    } else if (profile && currentLevel < prevLevelRef.current) {
      // sincronizar caso o nível caia (ex: reset pelo admin)
      prevLevelRef.current = currentLevel
    } else if (profile && prevLevelRef.current === 0) {
      // initial load fix
      prevLevelRef.current = currentLevel
    }
  }, [currentLevel, profile])

  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAnimation(false)}
        >
          <Confetti 
            width={window.innerWidth} 
            height={window.innerHeight} 
            recycle={false} 
            numberOfPieces={400}
            gravity={0.15}
            colors={['#facc15', '#eab308', '#ca8a04', '#6366f1', '#4f46e5', '#a855f7']}
          />
          
          <motion.div
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="relative flex flex-col items-center text-center p-8 bg-surface-900/90 border border-brand-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,116,241,0.2)] max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 bg-gradient-to-b from-yellow-400 to-yellow-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/20 border-4 border-surface-900">
              <Trophy size={40} className="text-white drop-shadow-md" />
            </div>
            
            <div className="mt-12 mb-2">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">
                Parabéns!
              </h2>
            </div>
            
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              Você alcançou o <br/>
              <span className="text-brand-400 font-black text-3xl uppercase tracking-wider block mt-2">
                Nível {leveledUpTo}
              </span>
            </p>
            
            <button 
              onClick={() => setShowAnimation(false)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              <Star size={18} /> Continuar Jogando
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
