import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, Hash, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateTime, truncate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge, CampaignStatusBadge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function useAuditData() {
  return useQuery({
    queryKey: ['transparency', 'audit-list'],
    queryFn: async () => {
      const [{ data: boxes, error: boxesError }, { data: wheels, error: wheelsError }] = await Promise.all([
        supabase
          .from('boxes')
          .select('id, name, audit_hash, audit_hash_generated_at, created_at')
          .not('audit_hash', 'is', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('wheels')
          .select('id, name, audit_hash, audit_hash_generated_at, created_at')
          .not('audit_hash', 'is', null)
          .order('created_at', { ascending: false }),
      ])

      if (boxesError) throw boxesError
      if (wheelsError) throw wheelsError

      const combined = [
        ...(boxes || []).map((b) => ({ ...b, type: 'box' as const })),
        ...(wheels || []).map((w) => ({ ...w, type: 'wheel' as const })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return combined
    },
  })
}

export default function Transparency() {
  const { data: auditItems, isLoading } = useAuditData()

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-6">
            <Shield size={28} className="text-brand-400" />
          </div>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3">
            Transparência & Auditoria
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Cada campanha possui um hash SHA-256 gerado antes do início. Qualquer pessoa pode verificar
            que a distribuição de prêmios não foi alterada.
          </p>
        </div>

        {/* How it works */}
        <Card variant="glass" className="mb-8">
          <h2 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <Hash size={20} className="text-brand-400" />
            Como funciona o hash SHA-256
          </h2>
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            <p>
              Antes de ativar cada sorteio (Box ou Roleta), você pode verificar se o nosso sistema gerou um hash SHA-256 com base nos prêmios distribuídos. Esse hash é publicado aqui, tornando impossível alterar o resultado e a probabilidade após ativado.
            </p>
            <p>
              Qualquer pessoa pode recalcular e comparar a semente (seed) e o hash para confirmar a integridade dos sorteios e das aberturas.
            </p>
            <div className="bg-surface-700/50 rounded-xl p-3 font-mono text-xs text-slate-300 break-all">
              SHA256(item_id + sorted_prizes + timestamp)
            </div>
          </div>
        </Card>

        {/* Items */}
        <h2 className="font-display font-semibold text-white text-xl mb-4 mt-8">
          Sorteios Auditáveis
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : auditItems && auditItems.length > 0 ? (
          <div className="space-y-4">
            {auditItems.map((item, i) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === 'box' ? 'brand' : 'info'} size="sm">
                          {item.type === 'box' ? '📦 Box' : '🎡 Roleta'}
                        </Badge>
                        <h3 className="font-semibold text-white text-base">{item.name}</h3>
                      </div>
                    </div>
                    <Badge variant="success">
                      <CheckCircle size={12} className="mr-1" />
                      Verificável
                    </Badge>
                  </div>

                  {/* Hash */}
                  <div className="bg-surface-700/50 rounded-xl p-3 mb-3">
                    <p className="text-slate-500 text-xs mb-1">Hash SHA-256</p>
                    <p className="font-mono text-xs text-slate-300 break-all">
                      {(item as any).audit_hash}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    {(item as any).audit_hash_generated_at && (
                      <span className="flex items-center gap-1">
                        <Hash size={11} />
                        Hash gerado em {formatDateTime((item as any).audit_hash_generated_at)}
                      </span>
                    )}
                    <span>Criado em: {formatDateTime(item.created_at)}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Shield size={28} />}
            title="Nenhum item auditável disponível"
            description="Os hashes aparecerão aqui após as boxes e roletas terem sua integridade gerada."
          />
        )}
      </div>
    </div>
  )
}
