import { Trophy, Award } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDateTime, maskName } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function useAllWinners() {
  return useQuery({
    queryKey: ['admin', 'winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, campaign:campaigns(name), prize:prizes(name), user:profiles(full_name, email), prize_claim:prize_claims(status)')
        .order('won_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

const sourceLabel: Record<string, string> = {
  instant: '⚡ Instantâneo',
  box: '📦 Box',
  wheel: '🎡 Roleta',
  draw: '🎯 Sorteio',
}

export default function AdminWinners() {
  const { data: winners, isLoading } = useAllWinners()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Ganhadores</h1>
        <p className="text-slate-400 text-sm">{winners?.length || 0} prêmios distribuídos</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : winners && winners.length > 0 ? (
        <div className="space-y-3">
          {winners.map((winner) => (
            <Card key={winner.id}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <Award size={18} className="text-gold-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">{(winner as any).user?.full_name}</p>
                      <p className="text-slate-500 text-xs">{(winner as any).user?.email}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" size="sm">{sourceLabel[winner.source] || winner.source}</Badge>
                      {(winner as any).prize_claim && (
                        <Badge variant="info" size="sm">{(winner as any).prize_claim?.status}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-gold-400 font-medium text-sm">🎁 {(winner as any).prize?.name}</p>
                  <p className="text-slate-500 text-xs">{(winner as any).campaign?.name}</p>
                  <p className="text-slate-600 text-xs">{formatDateTime(winner.won_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy size={28} />}
          title="Nenhum ganhador ainda"
          description="Os ganhadores aparecerão aqui conforme as premiações forem realizadas."
        />
      )}
    </div>
  )
}
