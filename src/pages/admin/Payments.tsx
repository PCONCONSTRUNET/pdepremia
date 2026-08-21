import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Clock, Wallet, ArrowDownToLine, HandCoins, X, Download, FileText, CheckCircle2, TrendingUp, BarChart3, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function usePaymentsHistory(statusFilter: string, dateFilter: string, searchQuery: string, page: number) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('payments_admin_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'all-payments'] })
          queryClient.invalidateQueries({ queryKey: ['admin', 'payments-metrics'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['admin', 'all-payments', statusFilter, dateFilter, searchQuery, page],
    queryFn: async () => {
      // Gatilho: cancela pagamentos expirados (10 min) silenciosamente
      await supabase.rpc('cancel_expired_payments')

      let query = supabase.from('admin_payments_view').select('*', { count: 'exact' })

      if (searchQuery) {
        // Find matching profiles first (cpf, phone)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${searchQuery}%,cpf.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          
        if (profiles && profiles.length > 0) {
          const userIds = profiles.map(p => p.id)
          query = query.or(`user_name.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%,user_id.in.(${userIds.join(',')})`)
        } else {
          query = query.or(`user_name.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`)
        }
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'paid') {
          query = query.in('status', ['paid', 'completed'])
        } else if (statusFilter === 'rejected') {
          query = query.in('status', ['rejected', 'failed', 'cancelled'])
        } else {
          query = query.eq('status', statusFilter)
        }
      }

      if (dateFilter !== 'all') {
        const dateMap: Record<string, number> = {
          '7d': 7,
          '30d': 30
        }
        if (dateFilter === 'today') {
           const today = new Date()
           today.setHours(0,0,0,0)
           query = query.gte('created_at', today.toISOString())
        } else if (dateMap[dateFilter]) {
          const pastDate = new Date()
          pastDate.setDate(pastDate.getDate() - dateMap[dateFilter])
          query = query.gte('created_at', pastDate.toISOString())
        }
      }

      // Pagination
      const from = (page - 1) * 15
      const to = from + 14

      // Busca da view unificada (Pagamentos + Bônus)
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
        
      if (error) throw error
      return { data, count }
    },
    refetchInterval: 15000,
  })
}

function usePaymentsMetrics(dateFilter: string) {
  return useQuery({
    queryKey: ['admin', 'payments-metrics', dateFilter],
    queryFn: async () => {
      let query = supabase.from('admin_payments_view')
        .select('amount, status')
        .in('status', ['paid', 'completed'])

      if (dateFilter !== 'all') {
        const dateMap: Record<string, number> = {
          '7d': 7,
          '30d': 30
        }
        if (dateFilter === 'today') {
           const today = new Date()
           today.setHours(0,0,0,0)
           query = query.gte('created_at', today.toISOString())
        } else if (dateMap[dateFilter]) {
          const pastDate = new Date()
          pastDate.setDate(pastDate.getDate() - dateMap[dateFilter])
          query = query.gte('created_at', pastDate.toISOString())
        }
      }

      const { data, error } = await query
      if (error) throw error

      const totalRevenue = data.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const count = data.length
      const avgTicket = count > 0 ? totalRevenue / count : 0

      return { totalRevenue, count, avgTicket }
    }
  })
}

const statusMap: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'muted' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  completed: { label: 'Concluído', variant: 'success' },
  paid: { label: 'Aprovado', variant: 'success' },
  failed: { label: 'Falhou', variant: 'danger' },
  rejected: { label: 'Rejeitado', variant: 'danger' },
  cancelled: { label: 'Rejeitado', variant: 'danger' },
}

function TransactionDetailsModal({ tx, onClose }: { tx: any, onClose: () => void }) {
  const isManual = tx.type === 'admin_bonus'
  const { data: paymentDetails, isLoading } = useQuery({
    queryKey: ['payment-details', tx.id],
    queryFn: async () => {
      if (isManual) return null
      const { data, error } = await supabase
        .from('payments')
        .select('gateway_id, gateway_payload, pix_key')
        .eq('id', tx.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !isManual
  })

  const s = statusMap[tx.status] || { label: tx.status || 'Concluído', variant: 'success' as const }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-md print:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        id="printable-receipt"
        className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl overflow-hidden print:w-full print:max-w-none print:shadow-none print:border-none print:bg-white print:text-black"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <FileText className="text-brand-400" size={24} />
              Detalhes da Transação
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="hidden print:block font-sans text-black">
            <div className="mb-8 border-b border-gray-200 pb-4 flex items-center justify-between">
              <h1 className="text-xl text-gray-500">Comprovante de Recebimento via Pix</h1>
              <img src="/logo-rodape.png" alt="P de Premia" className="h-16 object-contain" />
            </div>
            
            <div className="mb-8">
              <p className="text-gray-500 text-sm mb-1">Valor</p>
              <p className="text-brand-500 font-bold text-4xl mb-2">{formatCurrency(tx.amount || 0)}</p>
              <p className="text-gray-500 text-sm">Transação efetuada em {formatDateTime(tx.created_at)}</p>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-brand-500 font-semibold text-lg mb-4">Destino</h2>
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Nome</p>
                <p className="font-semibold text-gray-800">{tx.user_name || 'Usuário Sem Nome'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Método</p>
                <p className="font-semibold text-gray-800">PIX</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-brand-500 font-semibold text-lg mb-4">Origem</h2>
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Nome</p>
                <p className="font-semibold text-gray-800">MisticPay</p>
              </div>
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Banco</p>
                <p className="font-semibold text-gray-800">Only Up Instituição de Pagamento LTDA</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Status</p>
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                  tx.status === 'paid' || tx.status === 'completed' 
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                    : tx.status === 'rejected' || tx.status === 'failed'
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-amber-500 text-amber-600 bg-amber-50'
                }`}>
                  {s.label}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-gray-400 text-xs mb-1">ID da transação:</p>
              <p className="text-gray-800 text-sm">
                {isManual ? 'N/A' : (paymentDetails?.gateway_id || paymentDetails?.gateway_payload?.id || paymentDetails?.gateway_payload?.transaction_id || 'N/A')}
              </p>
            </div>
          </div>

          <div className="space-y-6 print:hidden">
            <div className="flex flex-col items-center justify-center p-6 bg-surface-800/50 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-sm mb-1">Valor</span>
              <span className={`text-3xl font-display font-bold ${
                tx.status === 'rejected' || tx.status === 'failed' ? 'text-red-400 line-through opacity-70' : 'text-emerald-400'
              }`}>
                {formatCurrency(tx.amount || 0)}
              </span>
              <div className="mt-3 flex items-center gap-2">
                {tx.status === 'paid' || tx.status === 'completed' ? (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                ) : tx.status === 'rejected' || tx.status === 'failed' ? (
                  <X size={16} className="text-red-400" />
                ) : (
                  <Clock size={16} className="text-amber-400" />
                )}
                <span className={`text-sm font-medium ${
                  tx.status === 'paid' || tx.status === 'completed' ? 'text-emerald-400'
                  : tx.status === 'rejected' || tx.status === 'failed' ? 'text-red-400'
                  : 'text-amber-400'
                }`}>{s.label}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-surface-800">
                <span className="text-slate-400 text-sm">Data</span>
                <span className="text-sm font-medium">{formatDateTime(tx.created_at)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-surface-800">
                <span className="text-slate-400 text-sm">Tipo</span>
                <span className="text-sm font-medium">{isManual ? 'Adição Manual' : 'Depósito PIX'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-surface-800">
                <span className="text-slate-400 text-sm">Usuário</span>
                <span className="text-sm font-medium">{tx.user_name || 'Usuário Sem Nome'}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-surface-800">
                <span className="text-slate-400 text-sm">Email</span>
                <span className="text-sm font-medium">{tx.user_email}</span>
              </div>
              
              {!isManual && (
                <>
                  {isLoading ? (
                    <div className="py-3 text-center text-sm text-slate-500">Carregando detalhes do gateway...</div>
                  ) : paymentDetails ? (
                    <>
                      <div className="flex flex-col gap-1 py-3 border-b border-surface-800">
                        <span className="text-slate-400 text-sm">ID da Transação (Gateway)</span>
                        <span className="text-xs font-mono text-slate-300 break-all">
                          {paymentDetails.gateway_id || paymentDetails.gateway_payload?.id || paymentDetails.gateway_payload?.transaction_id || 'N/A'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-surface-800 bg-surface-950 flex justify-end gap-3 print:hidden">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="primary" onClick={() => window.print()} className="flex items-center gap-2">
            <Download size={16} />
            Baixar PDF
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminPayments() {
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, dateFilter])

  const { data: historyData, isLoading } = usePaymentsHistory(statusFilter, dateFilter, debouncedSearch, page)
  const transactions = historyData?.data || []
  const count = historyData?.count || 0
  const totalPages = Math.max(1, Math.ceil(count / 15))

  const { data: metrics, isLoading: isMetricsLoading } = usePaymentsMetrics(dateFilter)
  const [selectedTx, setSelectedTx] = useState<any>(null)

  return (
    <>
      <div className="space-y-6 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Pagamentos Recebidos</h1>
          <p className="text-slate-400 text-sm">Histórico de todas as tentativas de depósito (PIX) e bônus manuais</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="text"
            placeholder="Buscar nome, CPF, email ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 w-full md:w-64 placeholder:text-slate-500"
          />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5"
          >
            <option value="all">Todos os Status</option>
            <option value="paid">Pagos / Concluídos</option>
            <option value="pending">Pendentes</option>
            <option value="rejected">Rejeitados / Cancelados</option>
          </select>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5"
          >
            <option value="all">Todo o período</option>
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-surface-900 border-surface-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Faturamento Realizado</p>
              {isMetricsLoading ? (
                <div className="h-8 w-24 bg-surface-800 animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-2xl font-bold text-white">{formatCurrency(metrics?.totalRevenue || 0)}</h3>
              )}
            </div>
          </div>
        </Card>
        
        <Card className="bg-surface-900 border-surface-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Total de Pagamentos</p>
              {isMetricsLoading ? (
                <div className="h-8 w-16 bg-surface-800 animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-2xl font-bold text-white">{metrics?.count || 0}</h3>
              )}
            </div>
          </div>
        </Card>
        
        <Card className="bg-surface-900 border-surface-800 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Ticket Médio</p>
              {isMetricsLoading ? (
                <div className="h-8 w-20 bg-surface-800 animate-pulse rounded mt-1"></div>
              ) : (
                <h3 className="text-2xl font-bold text-white">{formatCurrency(metrics?.avgTicket || 0)}</h3>
              )}
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : transactions && transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((tx, i) => {
            const s = statusMap[tx.status] || { label: tx.status || 'Concluído', variant: 'success' as const }
            const isManual = tx.type === 'admin_bonus'

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card 
                  className="cursor-pointer hover:border-brand-500/50 transition-colors"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isManual ? 'bg-purple-500/10 text-purple-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isManual ? <HandCoins size={24} /> : <ArrowDownToLine size={24} />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold">{tx.user_name || 'Usuário Sem Nome'}</p>
                        <Badge variant={s.variant} dot>{s.label}</Badge>
                        <Badge variant={isManual ? 'brand' : 'success'}>
                          {isManual ? 'Adição Manual' : 'Depósito PIX'}
                        </Badge>
                      </div>
                      <p className="text-slate-500 text-xs">{tx.user_email}</p>
                      
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
          icon={Wallet} 
          title="Nenhum pagamento" 
          description={searchQuery ? "Nenhum resultado encontrado para a sua busca." : "Ainda não há pagamentos no período selecionado."}
        />
      )}

      {/* Paginação */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6 print:hidden">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-slate-400 font-medium">Página {page} de {totalPages}</span>
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

    </div>
    
    {/* Modal de Detalhes */}
      {selectedTx && (
        <TransactionDetailsModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </>
  )
}
