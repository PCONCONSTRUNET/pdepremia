import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet, QrCode, Copy, CheckCircle, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { maskCurrency, formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_VALUES = [10, 20, 50]

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuth()
  const [amount, setAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [pixData, setPixData] = useState<{ qrcodeUrl: string, copyPaste: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  // Clear state when modal opens or closes
  useEffect(() => {
    setAmount('')
    setPixData(null)
    setOrderId(null)
    setIsLoading(false)
    setCopied(false)
  }, [isOpen])

  // Polling for payment status
  useEffect(() => {
    if (!isOpen || !pixData || !orderId) return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('payments')
        .select('status')
        .eq('order_id', orderId)
        .single()
      
      if (data?.status === 'paid' || data?.status === 'completed') {
        toast.success('🎉 Pagamento recebido com sucesso!')
        onClose()
      } else if (data?.status === 'rejected' || data?.status === 'failed') {
        toast.error('❌ Pagamento rejeitado ou expirado.')
        onClose()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isOpen, pixData, orderId, onClose])

  if (!isOpen) return null

  const numericAmount = Number(amount.replace(/\D/g, '')) / 100

  const handlePresetClick = (value: number) => {
    const stringValue = (value * 100).toString()
    setAmount(maskCurrency(stringValue))
  }

  const handleDeposit = async () => {
    if (numericAmount < 1) return // Min deposit R$ 1,00
    if (!user) {
      toast.error('Você precisa estar logado.')
      return
    }
    
    setIsLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, cpf')
        .eq('id', user.id)
        .single()

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          quantity: 1,
          unit_price: numericAmount,
          total_amount: numericAmount,
          status: 'awaiting_payment',
          payment_method: 'pix_gateway',
          notes: 'Depósito na Carteira'
        })
        .select()
        .single()

      if (orderError) throw orderError
      setOrderId(order.id)

      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: order.id,
        amount: numericAmount,
        method: 'pix_gateway',
        status: 'pending'
      })

      if (paymentError) {
        console.error('Error inserting payment:', paymentError)
        throw new Error('Erro do Banco: ' + (paymentError.message || JSON.stringify(paymentError)))
      }

      const { data, error: fnError } = await supabase.functions.invoke('misticpay-gateway/checkout', {
        body: {
          orderId: order.id,
          amount: numericAmount,
          payerName: profile?.full_name || 'Cliente',
          payerDocument: profile?.cpf || '05707755021', // mock de cpf valido se vazio
          description: `Adicionar Saldo - ${user.email}`
        }
      })

      if (fnError) {
        console.error('Erro de rede na Edge Function:', fnError)
        throw new Error('Falha de rede ao contatar o servidor de pagamento.')
      }

      if (!data?.success) {
        console.error('Erro retornado pela MisticPay:', data)
        throw new Error(data?.error || 'A MisticPay rejeitou a transação. Verifique os logs.')
      }

      // Robust extraction of payload strings
      const payloadString = data.pix?.copyPaste || data.pix?.payload || data.pix?.pixCopiaECola || data.pix?.qrCodeCopyPaste || data.pix?.qrcode || ''
      
      // Attempt to extract image or fallback to dynamically generating it from the string
      let imageUrl = data.pix?.qrCodeUrl || data.pix?.qrcodeUrl || data.pix?.qrCode || data.pix?.image
      
      if (!imageUrl || !imageUrl.startsWith('http')) {
         if (data.pix?.qrCodeBase64) {
           imageUrl = `data:image/png;base64,${data.pix.qrCodeBase64}`
         } else {
           imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payloadString)}`
         }
      }

      setPixData({
        qrcodeUrl: imageUrl,
        copyPaste: payloadString
      })

    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao gerar pagamento')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyPix = () => {
    if (!pixData) return
    navigator.clipboard.writeText(pixData.copyPaste)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
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
          className="relative w-full max-w-md bg-surface-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex flex-col items-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-surface-800/50 p-1.5 rounded-full"
            >
              <X size={20} />
            </button>
            
            <img 
              src="/logo-rodape.png" 
              alt="P DE PREMIA" 
              className="h-8 w-auto object-contain mb-3" 
            />
            
            <h2 className="text-xl font-display font-bold text-white mb-1">Adicionar Saldo</h2>
            <p className="text-slate-400 text-xs text-center">
              Adicione fundos à sua carteira via PIX.
            </p>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {!pixData ? (
              <>
                {/* Presets */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 text-center">
                    Escolha um valor rápido
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_VALUES.map((val) => (
                      <button
                        key={val}
                        onClick={() => handlePresetClick(val)}
                        className={`py-2.5 rounded-xl border transition-all text-sm font-bold ${
                          numericAmount === val
                            ? 'bg-brand-500/20 border-brand-500 text-brand-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                            : 'bg-surface-800/50 border-white/5 text-slate-300 hover:border-brand-500/30 hover:text-white'
                        }`}
                      >
                        R$ {val},00
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-[10px] uppercase tracking-wider font-medium">Ou digite o valor</span>
                  <div className="flex-grow border-t border-white/5"></div>
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
                      className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white text-lg font-bold focus:outline-none focus:border-brand-500 focus:bg-white/10 transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Action */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="primary"
                    className="w-full sm:w-3/4 py-3 text-base font-semibold rounded-full shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-shadow"
                    onClick={handleDeposit}
                    isLoading={isLoading}
                    disabled={numericAmount < 1}
                  >
                    Gerar PIX
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* Visual Polling Indicator */}
                <div className="flex items-center justify-center gap-2 text-brand-400 bg-brand-500/10 py-2 px-4 rounded-full w-max mx-auto border border-brand-500/20 shadow-[0_0_15px_rgba(251,191,36,0.1)] animate-pulse">
                  <Clock size={14} className="animate-spin-slow" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Aguardando Pagamento...</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-5 flex flex-col items-center justify-center w-max mx-auto shadow-2xl">
                  <div className="bg-white p-2 rounded-2xl">
                    <img 
                      src={pixData.qrcodeUrl} 
                      alt="QR Code PIX" 
                      className="w-40 h-40 object-cover rounded-xl"
                    />
                  </div>
                </div>
                
                <p className="text-slate-300 text-xs text-center drop-shadow-md">Escaneie o código acima com o aplicativo do seu banco</p>

                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/10 shadow-inner">
                  <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Ou use o PIX Copia e Cola:</p>
                  <div className="w-full bg-black/40 p-2.5 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-slate-300 border border-white/5">
                    {pixData.copyPaste}
                  </div>
                </div>

                <div className="bg-gradient-to-b from-white/10 to-transparent backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center shadow-lg">
                  <p className="text-slate-400 text-xs mb-1 uppercase tracking-widest font-semibold">Valor a pagar</p>
                  <p className="text-3xl font-bold text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{formatCurrency(numericAmount)}</p>
                  
                  <Button
                    variant="primary"
                    className="w-full shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-shadow font-bold text-sm py-4 tracking-wide uppercase mt-3 rounded-xl"
                    onClick={handleCopyPix}
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={18} className="mr-2" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={18} className="mr-2" /> Copiar PIX Copia e Cola
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <button 
                    onClick={() => {
                      setPixData(null)
                      setAmount('')
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4"
                  >
                    Cancelar e gerar outro valor
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
