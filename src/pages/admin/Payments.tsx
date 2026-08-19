import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Clock, Wallet, ArrowDownToLine, HandCoins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function usePaymentsHistory() {
  return useQuery({
    queryKey: ['admin', 'wallet-deposits'],
    queryFn: async () => {
      // Busca apenas as transações de entrada (API de PIX futura ou adição manual pelo admin)
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, user:profiles(full_name, email)')
        .in('type', ['deposit', 'admin_bonus'])
        .order('created_at', { ascending: false })
        .limit(100)
        
      if (error) throw error
      return data
    },
    refetchInterval: 15000,
  })
}

const statusMap: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'muted' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  completed: { label: 'Concluído', variant: 'success' },
  failed: { label: 'Falhou', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'muted' },
}

export default function AdminPayments() {
  const { data: transactions, isLoading } = usePaymentsHistory()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Pagamentos Recebidos</h1>
          <p className="text-slate-400 text-sm">Histórico de entradas de saldo no sistema (API PIX e Bônus Manual)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : transactions && transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((tx, i) => {
            const s = statusMap[tx.status] || { label: tx.status || 'Concluído', variant: 'success' as const }
            const user_info = (tx as any).user

            const isManual = tx.type === 'admin_bonus'

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isManual ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isManual ? <HandCoins size={24} /> : <ArrowDownToLine size={24} />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{user_info?.full_name || '—'}</p>
                        <Badge variant={s.variant} dot>{s.label}</Badge>
                        <Badge variant="muted">
                          {isManual ? 'Adição Manual' : 'Depósito API'}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-xs">{user_info?.email}</p>
                      
                      <div className="flex gap-4 text-xs text-slate-500 flex-wrap mt-2">
                        <span className="font-medium text-emerald-400">
                          + {formatCurrency(tx.amount || 0)}
                        </span>
                        <span>
                          <Clock size={12} className="inline mr-1" />
                          {formatDateTime(tx.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Wallet size={28} />}
          title="Nenhuma entrada registrada"
          description="Os pagamentos de saldo via API ou adições manuais aparecerão aqui."
        />
      )}
    </div>
  )
}
