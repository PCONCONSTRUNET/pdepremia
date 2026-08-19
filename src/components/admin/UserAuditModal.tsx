import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Activity, Package, Trophy, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Spinner, EmptyState } from '@/components/common/Loading'

interface AuditLog {
  log_id: string
  event_type: 'transaction' | 'prize_won' | 'box_opened'
  action_type: string
  amount: number
  details: any
  created_at: string
}

interface UserAuditModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserAuditModal({ isOpen, onClose, userId, userName }: UserAuditModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_audit_log', { p_user_id: userId })
      if (error) throw error
      return data as AuditLog[]
    },
    enabled: isOpen && !!userId
  })

  const handlePrint = () => {
    window.print()
  }

  const renderEventIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <DollarSign size={16} className="text-emerald-400" />
      case 'prize_won': return <Trophy size={16} className="text-gold-400" />
      case 'box_opened': return <Package size={16} className="text-brand-400" />
      default: return <Activity size={16} className="text-slate-400" />
    }
  }

  const renderEventDetails = (log: AuditLog) => {
    switch (log.event_type) {
      case 'transaction':
        return (
          <div>
            <span className="font-medium text-white capitalize">{log.action_type === 'promo_code' ? 'Código Promocional' : log.action_type}</span>
            <p className="text-xs text-slate-400">{log.details?.description || 'Transação na carteira'}</p>
          </div>
        )
      case 'prize_won':
        return (
          <div>
            <span className="font-medium text-white">Prêmio Ganho</span>
            <p className="text-xs text-slate-400">{log.details?.prize_name} (Ticket: {log.details?.ticket || 'Sorteio Direto'})</p>
          </div>
        )
      case 'box_opened':
        return (
          <div>
            <span className="font-medium text-white">Box Aberta</span>
            <p className="text-xs text-slate-400">{log.details?.box_name} - Prêmio: {log.details?.result_prize || 'Nenhum'}</p>
          </div>
        )
      default:
        return <span className="text-slate-400">Evento desconhecido</span>
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 print:p-0 print:block">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm print:hidden"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-4xl bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] print:border-none print:shadow-none print:bg-white print:text-black print:max-w-full print:max-h-none"
          >
            {/* Header (Hidden in Print) */}
            <div className="flex items-center justify-between p-6 border-b border-surface-700 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white font-display">Auditoria do Cliente</h2>
                  <p className="text-sm text-slate-400">{userName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Download size={16} />}>
                  Exportar PDF
                </Button>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
              <h1 className="text-2xl font-bold uppercase mb-2">Relatório de Auditoria</h1>
              <p className="text-sm text-gray-600">Cliente: {userName}</p>
              <p className="text-sm text-gray-600">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>

            {/* Body */}
            <div ref={printRef} className="p-6 overflow-y-auto print:overflow-visible print:p-0">
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  .fixed.inset-0 { position: absolute; left: 0; top: 0; padding: 0; margin: 0; }
                  .fixed.inset-0 * { visibility: visible; }
                }
              `}</style>
              
              {isLoading ? (
                <div className="py-12 flex justify-center"><Spinner /></div>
              ) : !logs || logs.length === 0 ? (
                <EmptyState icon={<Activity size={24} />} title="Nenhuma atividade" description="Este cliente não possui registros de auditoria." />
              ) : (
                <div className="w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-700 print:border-gray-300">
                        <th className="py-3 px-4 text-sm font-medium text-slate-400 print:text-black">Data/Hora</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-400 print:text-black">Evento</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-400 print:text-black">Detalhes</th>
                        <th className="py-3 px-4 text-sm font-medium text-slate-400 print:text-black text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800 print:divide-gray-200">
                      {logs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-surface-800/50 print:hover:bg-transparent">
                          <td className="py-3 px-4 text-sm text-slate-300 print:text-gray-800 whitespace-nowrap">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="print:hidden">{renderEventIcon(log.event_type)}</span>
                              <span className="text-sm capitalize font-medium text-slate-300 print:text-gray-800">
                                {log.event_type.replace('_', ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {renderEventDetails(log)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.amount != null ? (
                              <span className={`text-sm font-bold ${
                                log.action_type === 'deposit' || log.event_type === 'prize_won' || log.action_type === 'promo_code' ? 'text-emerald-400 print:text-green-700' :
                                log.action_type === 'withdrawal' || log.action_type === 'purchase' ? 'text-red-400 print:text-red-700' :
                                'text-white print:text-black'
                              }`}>
                                {log.action_type === 'withdrawal' || log.action_type === 'purchase' ? '- ' : '+ '}
                                {formatCurrency(log.amount)}
                              </span>
                            ) : (
                              <span className="text-slate-500 print:text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
