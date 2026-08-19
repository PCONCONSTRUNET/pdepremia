import { useQuery } from '@tanstack/react-query'
import { Shield, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateTime, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function useAuditLogs() {
  return useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, user:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
}

const actionColors: Record<string, 'success' | 'warning' | 'danger' | 'brand' | 'info' | 'gold'> = {
  PAYMENT_APPROVED: 'success',
  PAYMENT_REJECTED: 'danger',
  CAMPAIGN_ACTIVATED: 'brand',
  CAMPAIGN_ENDED: 'warning',
  TICKET_REVEALED: 'gold',
  BOX_OPENED: 'gold',
  WHEEL_SPUN: 'gold',
  DRAW_COMPLETED: 'success',
  PRIZE_CLAIMED: 'info',
}

export default function AdminAuditLogs() {
  const { data: logs, isLoading } = useAuditLogs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl flex items-center gap-2">
          <Shield size={22} className="text-brand-400" />
          Logs de Auditoria
        </h1>
        <p className="text-slate-400 text-sm">Registro imutável de todas as ações críticas</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : logs && logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} padding="sm" className="hover:border-surface-500/40 transition-colors">
              <div className="flex items-center gap-3">
                <Badge
                  variant={actionColors[log.action] || 'default'}
                  size="sm"
                  className="shrink-0 font-mono text-xs"
                >
                  {log.action}
                </Badge>
                <div className="flex-1 min-w-0">
                  {log.action === 'ADMIN_ADDED_BALANCE' ? (
                    <div className="text-sm font-medium text-white">
                      {(log as any).user?.full_name || 'Sistema'} <span className="text-brand-400">adicionou saldo</span> para {(log as any).metadata?.target_user_name || 'Usuário'} no valor de <span className="text-emerald-400">R$ {(log as any).metadata?.amount || 0}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <span className="text-white font-medium">{(log as any).user?.full_name || 'Sistema'}</span>
                      {log.entity && <span>→ {log.entity}</span>}
                      {log.entity_id && <span className="font-mono text-slate-600">#{log.entity_id.slice(0, 8)}</span>}
                    </div>
                  )}
                </div>
                <p className="text-slate-600 text-xs shrink-0">{formatDateTime(log.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Shield size={28} />}
          title="Nenhum log ainda"
          description="Os logs de auditoria aparecerão aqui conforme as ações forem realizadas."
        />
      )}
    </div>
  )
}
