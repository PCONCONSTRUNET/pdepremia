import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle, Clock, Shield, Ticket } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime, copyToClipboard } from '@/lib/utils'
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

// Hardcoded PIX key for manual PIX (in production, comes from system_settings)
const PIX_KEY = 'pagamentos@premiaja.com.br'
const PIX_NAME = 'Premiajá Campanhas'

export default function Checkout() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { data: order, isLoading } = useOrder(orderId!)

  const handleCopyPix = async () => {
    const pixPayload = `${PIX_KEY}`
    const success = await copyToClipboard(pixPayload)
    if (success) {
      setCopied(true)
      toast.success('Chave PIX copiada!')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (isLoading) return <LoadingPage message="Carregando pedido..." />
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
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle size={16} className="text-emerald-400" />
                </div>
                <h2 className="font-display font-semibold text-white text-lg">Pagar com PIX</h2>
              </div>

              <div className="bg-surface-700/50 rounded-xl p-4 mb-4 border border-surface-600/30">
                <p className="text-slate-400 text-xs mb-1">Chave PIX (E-mail)</p>
                <p className="text-white font-mono text-sm font-medium">{PIX_KEY}</p>
                <p className="text-slate-500 text-xs mt-1">Favorecido: {PIX_NAME}</p>
              </div>

              <div className="bg-gold-500/5 border border-gold-500/15 rounded-xl p-4 mb-4">
                <p className="text-slate-400 text-xs mb-1">Valor exato a pagar</p>
                <p className="font-display font-bold text-gold-400 text-2xl">
                  {formatCurrency(order.total_amount)}
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full mb-3"
                leftIcon={copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                onClick={handleCopyPix}
              >
                {copied ? 'Copiado!' : 'Copiar Chave PIX'}
              </Button>

              <div className="bg-surface-700/30 rounded-xl p-3 space-y-2">
                {[
                  'Abra seu banco e escolha a opção PIX',
                  `Cole a chave ou use a chave: ${PIX_KEY}`,
                  `Pague o valor exato de ${formatCurrency(order.total_amount)}`,
                  'Inclua o número do pedido no campo de identificação',
                  'Após confirmação, seus bilhetes serão liberados automaticamente',
                ].map((step, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-400">
                    <span className="text-brand-400 font-bold shrink-0">{i + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </Card>

            {/* Timer notice */}
            <div className="flex items-center gap-2 text-slate-500 text-xs justify-center">
              <Clock size={13} />
              Pedido expira em 30 minutos
            </div>

            {/* Trust */}
            <div className="flex items-center gap-2 text-slate-600 text-xs justify-center">
              <Shield size={13} />
              Pagamento manual confirmado pela nossa equipe
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
