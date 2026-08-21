import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle, Clock, Shield, Ticket, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { LoadingPage } from '@/components/common/Loading'

function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, campaign:campaigns(id, name, slug, banner_url), box:boxes(id, name, image_url), payment:payments(*)')
        .eq('id', orderId)
        .single()
      if (error) throw error
      return data
    },
    refetchInterval: (query) => {
      // Poll while payment is pending
      const status = (query.state.data as any)?.status
      return status === 'awaiting_payment' ? 5000 : false
    },
  })
}

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { data: order, isLoading: isOrderLoading } = useOrder(orderId!)
  
  const [pixData, setPixData] = useState<{ copyPaste: string, qrcodeUrl: string } | null>(null)
  const [isGeneratingPix, setIsGeneratingPix] = useState(false)

  useEffect(() => {
    if (order && order.status === 'awaiting_payment' && !pixData && !isGeneratingPix) {
      generatePix()
    }
  }, [order, pixData])

  const generatePix = async () => {
    if (!order) return
    setIsGeneratingPix(true)
    try {
      const { data, error } = await supabase.functions.invoke('misticpay-gateway/checkout', {
        body: {
          orderId: order.id,
          amount: order.total_amount,
          description: `Pedido ${order.id.slice(0, 8).toUpperCase()} - Premiajá`
        }
      })

      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao gerar PIX')
      }

      setPixData(data.pix)
    } catch (error) {
      console.error('Erro ao gerar PIX:', error)
      toast.error('Não foi possível gerar o PIX automático no momento.')
    } finally {
      setIsGeneratingPix(false)
    }
  }

  const handleCopyPix = async () => {
    if (!pixData?.copyPaste) return
    const success = await copyToClipboard(pixData.copyPaste)
    if (success) {
      setCopied(true)
      toast.success('Chave PIX Copia e Cola copiada!')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (isOrderLoading) return <LoadingPage message="Carregando pedido..." />
  if (!order) return <div className="text-center py-20 text-slate-400">Pedido não encontrado.</div>

  const isPaid = order.status === 'paid'

  return (
    <div className="min-h-screen bg-hero-gradient py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-white text-2xl mb-1">
            {isPaid ? 'Pagamento Confirmado! 🎉' : 'Finalizar Pagamento'}
          </h1>
          <p className="text-slate-400 text-sm">Pedido #{orderId?.slice(0, 8).toUpperCase()}</p>
        </div>

        {isPaid ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card variant="prize" className="text-center py-8 mb-4">
              <div className="text-6xl mb-4">{order.box_id ? '📦' : '🎊'}</div>
              <h2 className="font-display font-bold text-white text-xl mb-2">
                {order.box_id ? 'Sua Box está pronta!' : 'Seus bilhetes foram gerados!'}
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                {order.box_id
                  ? 'Sua box foi liberada! Abra agora para descobrir qual prêmio você tirou.'
                  : 'Acesse sua carteira para revelar seus bilhetes e ver seus prêmios.'}
              </p>
              <Button
                variant="gold"
                size="lg"
                onClick={() => order.box_id ? navigate(`/abrir-box/${order.id}`) : navigate('/meus-bilhetes')}
                leftIcon={<Ticket size={18} />}
              >
                {order.box_id ? 'Abrir Box Agora' : 'Ver Meus Bilhetes'}
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Order summary */}
            <Card>
              <h2 className="font-display font-semibold text-white text-lg mb-4">Resumo do Pedido</h2>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{order.box_id ? 'Produto' : 'Campanha'}</span>
                  <span className="text-white font-medium">
                    {order.box_id ? (order as any).box?.name : (order as any).campaign?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{order.box_id ? 'Quantidade' : 'Bilhetes'}</span>
                  <span className="text-white">{order.quantity}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Preço unitário</span>
                  <span className="text-white">{formatCurrency(order.unit_price)}</span>
                </div>
                <div className="border-t border-surface-700/50 pt-2 flex justify-between">
                  <span className="text-white font-semibold">Total</span>
                  <span className="font-display font-bold text-white text-xl">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-slate-400 text-sm">Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
            </Card>

            {/* PIX Payment */}
            <Card variant="elevated">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <QrCode size={16} className="text-brand-400" />
                </div>
                <h2 className="font-display font-semibold text-white text-lg">Pagamento PIX</h2>
              </div>

              {isGeneratingPix && !pixData ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                  <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-sm">Gerando QR Code Pix dinâmico...</p>
                </div>
              ) : pixData ? (
                <>
                  <div className="bg-surface-900 rounded-xl p-4 mb-4 border border-surface-700 flex flex-col items-center justify-center">
                    <img 
                      src={pixData.qrcodeUrl} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 rounded-lg mb-2 object-cover"
                    />
                    <p className="text-slate-400 text-xs text-center">Escaneie o código acima com o aplicativo do seu banco</p>
                  </div>

                  <div className="bg-surface-700/50 rounded-xl p-4 mb-4 border border-surface-600/30">
                    <p className="text-slate-400 text-xs mb-2">Ou use o PIX Copia e Cola:</p>
                    <div className="w-full bg-surface-900 p-3 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-slate-300">
                      {pixData.copyPaste}
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 mb-4">
                    <p className="text-slate-400 text-xs mb-1">Valor exato a pagar</p>
                    <p className="font-display font-bold text-emerald-400 text-2xl">
                      {formatCurrency(order.total_amount)}
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mb-3"
                    leftIcon={copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    onClick={handleCopyPix}
                  >
                    {copied ? 'Código Copiado!' : 'Copiar PIX Copia e Cola'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-red-400 text-sm mb-4">Falha ao gerar o código de pagamento.</p>
                  <Button variant="outline" onClick={generatePix}>Tentar Novamente</Button>
                </div>
              )}

              <div className="bg-surface-700/30 rounded-xl p-3 mt-4 space-y-2">
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="text-brand-400 font-bold shrink-0">1.</span>
                  Abra o aplicativo do seu banco e acesse a área PIX
                </div>
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="text-brand-400 font-bold shrink-0">2.</span>
                  Escolha "Ler QR Code" ou "PIX Copia e Cola"
                </div>
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="text-brand-400 font-bold shrink-0">3.</span>
                  Após o pagamento, esta tela será atualizada automaticamente
                </div>
              </div>
            </Card>

            {/* Timer notice */}
            <div className="flex items-center gap-2 text-slate-500 text-xs justify-center">
              <Clock size={13} />
              O pagamento expira em 30 minutos
            </div>

            {/* Trust */}
            <div className="flex items-center gap-2 text-brand-400/80 text-xs justify-center">
              <Shield size={13} />
              Transação criptografada e totalmente segura
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
