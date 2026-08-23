import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Minus, Landmark, History, AlertCircle, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/common/Loading'
import { Spinner } from '@/components/common/Loading'
import toast from 'react-hot-toast'

interface TreasuryLog {
  id: string
  type: 'deposit' | 'withdrawal' | 'manual_add' | 'manual_remove'
  amount: number
  description: string
  created_at: string
  profiles?: { full_name: string } | null
}

const actionLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'brand' | 'warning' }> = {
  deposit: { label: 'Depósito Cliente', variant: 'success' },
  withdrawal: { label: 'Saque Aprovado', variant: 'danger' },
  manual_add: { label: 'Adição Manual', variant: 'brand' },
  manual_remove: { label: 'Remoção Manual', variant: 'warning' }
}

export default function Treasury() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'remove'>('add')
  const [amountInput, setAmountInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch Balance
  const { data: balance = 0, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['admin', 'treasury-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_treasury')
        .select('balance')
        .eq('id', 1)
        .single()
      
      if (error) throw error
      return data?.balance || 0
    },
    refetchInterval: 15000
  })

  // Fetch Logs
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['admin', 'treasury-logs', page],
    queryFn: async () => {
      const from = (page - 1) * 20
      const to = from + 19

      const { data, count, error } = await supabase
        .from('site_treasury_logs')
        .select('*, profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data: data as TreasuryLog[], count: count || 0 }
    }
  })

  const totalPages = Math.ceil((logsData?.count || 0) / 20)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amount = Number(amountInput.replace(/\D/g, '')) / 100
    if (amount <= 0) {
      toast.error('O valor deve ser maior que zero')
      return
    }

    if (!descriptionInput.trim()) {
      toast.error('Por favor, informe uma descrição/motivo')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const type = modalType === 'add' ? 'manual_add' : 'manual_remove'
      
      const { error } = await supabase.rpc('update_site_treasury', {
        p_amount: amount,
        p_type: type,
        p_description: descriptionInput.trim(),
        p_user_id: user?.id
      })

      if (error) throw error

      toast.success(modalType === 'add' ? 'Saldo adicionado com sucesso!' : 'Saldo removido com sucesso!')
      setIsModalOpen(false)
      setAmountInput('')
      setDescriptionInput('')
      
      // Refresh
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-balance'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-logs'] })

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Ocorreu um erro ao atualizar o caixa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const formatted = (Number(numbers) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
    setAmountInput(formatted)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
          <Landmark size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Caixa do Sistema</h1>
          <p className="text-slate-400">Controle o saldo financeiro real da plataforma.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel do Saldo */}
        <Card className="lg:col-span-1 p-8 bg-surface-900 border border-surface-800 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-slate-400 font-medium mb-2 flex items-center gap-2 relative z-10">
            <Landmark size={18} />
            Saldo em Caixa
          </h2>
          
          {isBalanceLoading ? (
            <div className="h-12 w-48 bg-surface-800 animate-pulse rounded-lg mt-2 mb-8 relative z-10"></div>
          ) : (
            <div className={`text-4xl md:text-5xl font-display font-bold mb-8 relative z-10 ${balance >= 0 ? 'text-white' : 'text-red-500'}`}>
              {formatCurrency(balance)}
            </div>
          )}

          <div className="flex gap-3 w-full relative z-10">
            <Button
              className="flex-1"
              variant="brand"
              onClick={() => {
                setModalType('add')
                setIsModalOpen(true)
              }}
            >
              <Plus size={18} className="mr-2" />
              Entrada
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setModalType('remove')
                setIsModalOpen(true)
              }}
            >
              <Minus size={18} className="mr-2" />
              Saída
            </Button>
          </div>
        </Card>

        {/* Histórico */}
        <Card className="lg:col-span-2 bg-surface-900 border-surface-800 flex flex-col h-[600px]">
          <div className="p-6 border-b border-surface-800 flex justify-between items-center bg-surface-950/50 rounded-t-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="text-brand-400" size={20} />
              Histórico de Movimentações
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {isLogsLoading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner size="lg" />
              </div>
            ) : logsData?.data && logsData.data.length > 0 ? (
              logsData.data.map((log) => {
                const info = actionLabels[log.type] || { label: 'Desconhecido', variant: 'muted' }
                const isPositive = log.type === 'deposit' || log.type === 'manual_add'
                
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-surface-700 bg-surface-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={info.variant}>{info.label}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                      </div>
                      <p className="text-slate-300 font-medium text-sm">
                        {log.description}
                      </p>
                      {log.profiles && (
                        <p className="text-slate-500 text-xs">
                          Operador: {log.profiles.full_name}
                        </p>
                      )}
                    </div>
                    
                    <div className={`text-lg font-bold whitespace-nowrap ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : '-'} {formatCurrency(log.amount)}
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="h-full flex items-center justify-center">
                 <EmptyState 
                  icon={<Landmark size={48} className="text-surface-600 mb-4 mx-auto" />} 
                  title="Nenhum registro" 
                  description="O caixa ainda não teve movimentações."
                />
              </div>
            )}
          </div>

          {/* Paginação */}
          {!isLogsLoading && totalPages > 1 && (
            <div className="p-4 border-t border-surface-800 bg-surface-950/30 flex justify-center items-center gap-4 rounded-b-2xl">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-400 font-medium">
                Página {page} de {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Nova Transação */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
              onClick={() => !isSubmitting && setIsModalOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  {modalType === 'add' ? (
                    <><Plus className="text-emerald-400" /> Adicionar Saldo</>
                  ) : (
                    <><Minus className="text-red-400" /> Remover Saldo</>
                  )}
                </h2>
                <button
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {modalType === 'remove' && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">Iso debitará o saldo real do caixa. Certifique-se de registrar o motivo correto (ex: Pagamento Servidor, Retirada de Lucro).</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Valor
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                    <input
                      type="text"
                      value={amountInput}
                      onChange={(e) => formatCurrencyInput(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-surface-950 border border-surface-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Descrição / Motivo
                  </label>
                  <input
                    type="text"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    placeholder={modalType === 'add' ? "Ex: Aporte inicial" : "Ex: Pagamento da AWS"}
                    className="w-full bg-surface-950 border border-surface-700 rounded-xl py-3 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
                    required
                  />
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    variant={modalType === 'add' ? 'brand' : 'danger'}
                    isLoading={isSubmitting}
                  >
                    Confirmar {modalType === 'add' ? 'Entrada' : 'Saída'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
