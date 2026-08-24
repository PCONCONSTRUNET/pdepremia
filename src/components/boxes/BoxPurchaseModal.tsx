import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minus, Plus, ShoppingCart, Wallet, PackageOpen } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface BoxPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  box: any
}

export function BoxPurchaseModal({ isOpen, onClose, box }: BoxPurchaseModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState<'select' | 'success'>('select')
  const [orderId, setOrderId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  if (!isOpen || !box) return null

  const totalCost = box.price * quantity
  const currentBalance = (profile as any)?.balance || 0
  const hasSufficientBalance = currentBalance >= totalCost

  const handleIncrement = () => setQuantity(prev => Math.min(prev + 1, 100))
  const handleDecrement = () => setQuantity(prev => Math.max(prev - 1, 1))

  const setPresetQuantity = (qty: number) => setQuantity(qty)

  const handlePurchase = async () => {
    if (!user) {
      toast.error('Você precisa estar logado.')
      navigate('/login')
      return
    }

    if (!hasSufficientBalance) {
      toast.error('Saldo insuficiente na carteira.')
      return
    }

    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('buy_boxes_with_wallet', {
        p_box_id: box.id,
        p_quantity: quantity
      })

      if (error) throw error

      setOrderId(data)
      setStep('success')
    } catch (error: any) {
      console.error('Erro na compra:', error)
      toast.error(error.message || 'Erro ao processar a compra.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setStep('select')
      setQuantity(1)
      setOrderId(null)
    }, 300)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col"
        >
          {step === 'select' ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-700 flex items-center justify-between bg-surface-800 shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart size={20} className="text-brand-400" />
                  Comprar Box
                </h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Box Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-800 border border-surface-700">
                  <div className="w-16 h-16 rounded-xl bg-surface-900 flex items-center justify-center overflow-hidden shrink-0">
                    {box.image_url ? (
                      <img src={box.image_url} alt={box.name} className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 bg-surface-700 rounded-lg" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{box.name}</h3>
                    <p className="text-sm text-brand-400 font-medium">{formatCurrency(box.price)} / un</p>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-3">
                    Quantidade
                  </label>
                  
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-surface-950 border border-surface-700">
                      <button 
                        onClick={handleDecrement}
                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-surface-800 text-white hover:bg-surface-700 transition-colors shrink-0"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="text-xl sm:text-2xl font-bold text-white w-16 sm:w-20 text-center">
                        {quantity}
                      </span>
                      <button 
                        onClick={handleIncrement}
                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors shrink-0"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      {[5, 10, 20, 50].map(qty => (
                        <button
                          key={qty}
                          onClick={() => setPresetQuantity(qty)}
                          className={`py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors border ${
                            quantity === qty 
                              ? 'bg-brand-500 border-brand-500 text-white' 
                              : 'bg-surface-800 border-surface-700 text-slate-300 hover:bg-surface-700'
                          }`}
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total and Balance */}
                <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Total a pagar:</span>
                    <span className="text-xl font-bold text-white">{formatCurrency(totalCost)}</span>
                  </div>
                  
                  <div className="h-px bg-surface-800 w-full" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Wallet size={14} />
                      <span>Seu Saldo:</span>
                    </div>
                    <span className={`font-medium ${hasSufficientBalance ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                </div>

                {!hasSufficientBalance && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    Você não tem saldo suficiente. Adicione fundos à sua carteira para continuar.
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 pt-0 shrink-0">
                <Button
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-bold"
                  onClick={handlePurchase}
                  disabled={isProcessing || !hasSufficientBalance}
                  isLoading={isProcessing}
                >
                  Confirmar Compra
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <PackageOpen size={40} className="relative z-10" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Compra Aprovada!</h2>
                <p className="text-slate-400">
                  {quantity} {quantity > 1 ? 'boxes foram adicionadas' : 'box foi adicionada'} ao seu inventário. O que deseja fazer agora?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    handleClose()
                    navigate('/meus-premios') 
                  }} 
                  className="h-12 border-surface-700 hover:bg-surface-800"
                >
                  Mais Tarde
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => { 
                    handleClose()
                    navigate('/abrir-box/' + orderId) 
                  }} 
                  className="h-12"
                >
                  Abrir Agora
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
