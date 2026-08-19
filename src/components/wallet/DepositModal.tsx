import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { maskCurrency } from '@/lib/utils'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_VALUES = [10, 20, 50]

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const numericAmount = Number(amount.replace(/\D/g, '')) / 100

  const handlePresetClick = (value: number) => {
    // Format as currency string (e.g. 1000 for R$ 10,00)
    const stringValue = (value * 100).toString()
    setAmount(maskCurrency(stringValue))
  }

  const handleDeposit = async () => {
    if (numericAmount < 1) return // Min deposit R$ 1,00
    
    setIsLoading(true)
    try {
      // TODO: Integrate with payment gateway to generate PIX payload
      console.log('Depositing:', numericAmount)
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500))
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface-800 border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-surface-700/50 flex flex-col items-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <img 
              src="/logo-rodape.png" 
              alt="P DE PREMIA" 
              className="h-10 w-auto object-contain mb-4" 
            />
            
            <h2 className="text-2xl font-display font-bold text-white mb-1">Adicionar Saldo</h2>
            <p className="text-slate-400 text-sm text-center">
              Adicione fundos à sua carteira via PIX.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Presets */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3 text-center">
                Escolha um valor rápido
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PRESET_VALUES.map((val) => (
                  <button
                    key={val}
                    onClick={() => handlePresetClick(val)}
                    className={`py-3 rounded-xl border transition-all text-sm font-bold ${
                      numericAmount === val
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-surface-900 border-surface-700 text-slate-300 hover:border-brand-500/50 hover:text-white'
                    }`}
                  >
                    R$ {val},00
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-surface-700/50"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase tracking-wider font-medium">Ou digite o valor</span>
              <div className="flex-grow border-t border-surface-700/50"></div>
            </div>

            {/* Custom Input */}
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  R$
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(maskCurrency(e.target.value))}
                  placeholder="0,00"
                  className="w-full bg-surface-900 border border-surface-700 rounded-xl py-4 pl-12 pr-4 text-white text-xl font-bold focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-center pt-2">
              <Button
                variant="primary"
                className="w-full sm:w-2/3 py-3 text-base font-semibold rounded-full shadow-lg shadow-brand-500/25"
                onClick={handleDeposit}
                isLoading={isLoading}
                disabled={numericAmount < 1}
              >
                Gerar PIX
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
