import { X, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProvablyFairModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    color: 'red' | 'white' | 'black'
    number: number | string
    timestamp: string
    hash?: string
    roundId?: number
  } | null
}

const DOUBLE_SEQUENCE = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8]

export function ProvablyFairModal({ isOpen, onClose, item }: ProvablyFairModalProps) {
  const [copied, setCopied] = useState(false)

  if (!item) return null

  const handleCopy = () => {
    if (item.hash) {
      navigator.clipboard.writeText(item.hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Encontrar a posição do número na sequência
  const numValue = item.number === 'W' ? 0 : Number(item.number)
  const resultIndex = DOUBLE_SEQUENCE.indexOf(numValue)
  
  // Pegar os 2 anteriores e 2 próximos (com wrap-around)
  const getAdjacent = (offset: number) => {
    let newIndex = (resultIndex + offset) % DOUBLE_SEQUENCE.length
    if (newIndex < 0) newIndex += DOUBLE_SEQUENCE.length
    return DOUBLE_SEQUENCE[newIndex]
  }

  const adjacentBalls = [
    getAdjacent(-2),
    getAdjacent(-1),
    numValue,
    getAdjacent(1),
    getAdjacent(2)
  ]

  const getColor = (num: number) => {
    if (num === 0) return 'white'
    if (num >= 1 && num <= 7) return 'red'
    return 'black'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg bg-[#1E2329] rounded-2xl overflow-hidden shadow-2xl border border-surface-700"
          >
            {/* Header */}
            <div className="relative p-6 text-center border-b border-surface-700 bg-[#232930]">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold text-white mb-1">Rodada de Double</h2>
              <p className="text-sm text-slate-400">
                #{item.hash ? item.hash.substring(0, 10) : (item.roundId || '---')} jogada em {item.timestamp}
              </p>
            </div>

            {/* Balls Display */}
            <div className="p-8 bg-[#1A1F24]">
              <div className="relative flex justify-center items-center gap-2">
                {/* Indicador Central (Linha Branca) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-32 bg-white z-10 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                
                {adjacentBalls.map((num, idx) => {
                  const color = getColor(num)
                  const isCenter = idx === 2
                  return (
                    <div
                      key={idx}
                      className={`relative flex items-center justify-center rounded-xl transition-all ${
                        isCenter ? 'w-20 h-20 z-0 shadow-lg' : 'w-16 h-16 opacity-50'
                      } ${
                        color === 'red' ? 'bg-[#F12C4C]' : color === 'white' ? 'bg-white' : 'bg-[#2B3139] border border-surface-700'
                      }`}
                    >
                      <div className={`rounded-full border-4 flex items-center justify-center font-bold ${
                        isCenter ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-sm'
                      } ${
                        color === 'white' ? 'border-[#1A1F24] text-[#1A1F24]' : 'border-white text-white'
                      }`}>
                        {num === 0 ? 'W' : num}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Hash Display */}
            <div className="p-6 bg-[#1E2329] border-t border-surface-700">
              <div className="bg-[#1A1F24] rounded-xl p-4 flex items-center justify-between border border-surface-800">
                <span className="text-slate-500 font-mono text-xs truncate mr-4">
                  {item.hash || 'Hash não disponível para rodadas antigas'}
                </span>
                {item.hash && (
                  <button
                    onClick={handleCopy}
                    className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    title="Copiar Hash"
                  >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
