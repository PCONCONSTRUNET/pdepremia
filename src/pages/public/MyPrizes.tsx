import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Gift, Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { PrizeClaimStatusBadge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

function useMyPrizes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['prizes', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, campaign:campaigns(name), prize:prizes(name, prize_type, reference_value, image_url), prize_claim:prize_claims(*)')
        .eq('user_id', user!.id)
        .order('won_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}

function useUserRewards() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user_rewards', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_rewards')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.id,
  })
}

function useUnopenedBoxes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['unopened_boxes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_boxes')
        .select('*, box:boxes(*)')
        .eq('user_id', user!.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}

const sourceLabel: Record<string, string> = {
  instant: '⚡ Prêmio Instantâneo',
  box: '📦 Box da Sorte',
  wheel: '🎡 Roleta da Sorte',
  draw: '🎯 Sorteio Principal',
}

const statusIcon: Record<string, React.ReactNode> = {
  won: <Trophy size={20} className="text-gold-400" />,
  pending_confirmation: <Clock size={20} className="text-amber-400" />,
  separating: <Package size={20} className="text-brand-400" />,
  shipped: <Truck size={20} className="text-blue-400" />,
  delivered: <CheckCircle size={20} className="text-emerald-400" />,
  cancelled: <XCircle size={20} className="text-red-400" />,
}

export default function MyPrizes() {
  const { data: prizes, isLoading: prizesLoading } = useMyPrizes()
  const { data: rewards, isLoading: rewardsLoading } = useUserRewards()
  const { data: unopenedBoxes, isLoading: unopenedLoading } = useUnopenedBoxes()
  const [activeTab, setActiveTab] = useState<'campaigns' | 'rewards' | 'boxes'>('campaigns')
  const [campaignPage, setCampaignPage] = useState(1)
  const itemsPerPage = 10

  const groupedBoxes = unopenedBoxes?.reduce((acc: any, ubox: any) => {
    const boxId = ubox.box_definition_id;
    if (!acc[boxId]) {
      acc[boxId] = {
        boxId: boxId,
        box: ubox.box,
        items: []
      }
    }
    acc[boxId].items.push(ubox);
    return acc;
  }, {})

  const groupedBoxesArray = groupedBoxes ? Object.values(groupedBoxes) : []

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-white text-2xl sm:text-3xl flex items-center gap-3">
            <Trophy className="text-gold-400" />
            Central de Recompensas
          </h1>
          <p className="text-slate-400 mt-1">Seu inventário de prêmios e benefícios</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-surface-700 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Prêmios de Campanhas
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'rewards'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Outras Recompensas
            {rewards && rewards.filter(r => r.status === 'available').length > 0 && (
              <span className="bg-brand-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {rewards.filter(r => r.status === 'available').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('boxes')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'boxes'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Boxes Fechadas
            {unopenedBoxes && unopenedBoxes.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                {unopenedBoxes.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'campaigns' ? (
          prizesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : prizes && prizes.length > 0 ? (
            <div className="space-y-4">
              {prizes.slice((campaignPage - 1) * itemsPerPage, campaignPage * itemsPerPage).map((winner, i) => {
                const claim = (winner as any).prize_claim
                return (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card variant={claim?.status === 'delivered' ? 'default' : 'prize'} className="relative overflow-hidden">
                      {claim?.status !== 'delivered' && (
                        <div className="absolute inset-0 shine-effect opacity-20" />
                      )}
                      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Icon */}
                        <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                          {statusIcon[claim?.status || 'won']}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h3 className="font-display font-semibold text-white text-base">
                              {(winner as any).prize?.name}
                            </h3>
                            <PrizeClaimStatusBadge status={claim?.status || 'won'} />
                          </div>
                          <p className="text-slate-400 text-sm">{(winner as any).campaign?.name}</p>
                          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                            <span>{sourceLabel[winner.source] || winner.source}</span>
                            {winner.display_ticket && <span>Bilhete {winner.display_ticket}</span>}
                            <span>{formatDateTime(winner.won_at)}</span>
                          </div>
                          {(winner as any).prize?.reference_value && (
                            <p className="text-gold-400 text-sm font-medium">
                              Valor: {formatCurrency((winner as any).prize.reference_value)}
                            </p>
                          )}
                          {claim?.tracking_code && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Truck size={12} className="text-blue-400" />
                              <span className="text-slate-400">Rastreio:</span>
                              <span className="text-white font-mono">{claim.tracking_code}</span>
                            </div>
                          )}
                          {claim?.redemption_code && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Gift size={12} className="text-gold-400" />
                              <span className="text-slate-400">Código:</span>
                              <span className="text-white font-mono font-bold">{claim.redemption_code}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
              {prizes.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4 pb-2 border-t border-surface-700/50 mt-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCampaignPage(p => Math.max(1, p - 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={campaignPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-slate-400 font-medium">
                    Página {campaignPage} de {Math.ceil(prizes.length / itemsPerPage)}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCampaignPage(p => Math.min(Math.ceil(prizes.length / itemsPerPage), p + 1))
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    disabled={campaignPage === Math.ceil(prizes.length / itemsPerPage)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Trophy size={28} />}
              title="Nenhum prêmio ainda"
              description="Participe de campanhas e revele seus bilhetes para ganhar prêmios incríveis!"
              action={
                <Link to="/">
                  <Button variant="primary" size="sm">Ver Campanhas</Button>
                </Link>
              }
            />
          )
        ) : activeTab === 'rewards' ? (
          rewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward, i) => (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-800 border border-surface-700 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden"
                >
                  <div className="w-16 h-16 rounded-xl bg-surface-700/50 flex items-center justify-center border border-surface-600/50 shrink-0 overflow-hidden">
                    {reward.image_url ? (
                      <img src={reward.image_url} alt={reward.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Gift className="text-brand-400" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                      {reward.category}
                    </span>
                    <h3 className="text-white font-bold text-lg mt-1 leading-tight">{reward.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {reward.source === 'daily_wheel' ? 'Ganho na Roleta' : 'Recompensa'} • {formatDateTime(reward.created_at)}
                    </p>
                  </div>
                  
                  {reward.status === 'available' ? (
                    <Button 
                      size="sm" 
                      variant="primary" 
                      className="shrink-0"
                      onClick={() => {
                        window.open(`https://wa.me/5599999999999?text=Ol%C3%A1%21+Gostaria+de+resgatar+minha+recompensa%3A+${encodeURIComponent(reward.name)}`, '_blank')
                      }}
                    >
                      Resgatar
                    </Button>
                  ) : (
                    <div className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      <CheckCircle size={14} />
                      RESGATADO
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Gift size={28} />}
              title="Inventário Vazio"
              description="Você ainda não possui recompensas no seu inventário. Gire a roleta diária!"
              action={
                <Link to="/roleta-diaria">
                  <Button variant="primary" size="sm">Girar Roleta</Button>
                </Link>
              }
            />
          )
        ) : (
          unopenedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : groupedBoxesArray && groupedBoxesArray.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {groupedBoxesArray.map((group: any, i: number) => {
                const count = group.items.length;
                const firstBox = group.items[0];
                return (
                <motion.div
                  key={group.boxId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-800 border border-surface-700 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-brand-500/5 group-hover:bg-brand-500/10 transition-colors pointer-events-none" />
                  
                  {count > 1 && (
                    <div className="absolute top-4 right-4 bg-brand-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md shadow-lg z-20">
                      {count}x
                    </div>
                  )}

                  <div className="w-24 h-24 mb-4 relative">
                    <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full" />
                    {group.box?.image_url ? (
                      <img src={group.box.image_url} alt={group.box.name} className="w-full h-full object-contain relative z-10 drop-shadow-lg" />
                    ) : (
                      <Package size={64} className="text-brand-400 relative z-10 w-full h-full p-2" />
                    )}
                  </div>
                  
                  <h3 className="text-white font-bold text-lg mb-1">{group.box?.name || 'Box da Sorte'}</h3>
                  <p className="text-slate-400 text-xs mb-6">
                    {count > 1 ? `${count} boxes aguardando` : `Adquirida em ${formatDateTime(firstBox.created_at)}`}
                  </p>
                  
                  <Link to={`/abrir-box/${firstBox.id}`} className="w-full">
                    <Button variant="primary" className="w-full shadow-lg shadow-brand-500/25">
                      Abrir Agora
                    </Button>
                  </Link>
                </motion.div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Package size={28} />}
              title="Nenhuma Box Fechada"
              description="Você não possui boxes aguardando para serem abertas."
              action={
                <Link to="/boxes">
                  <Button variant="primary" size="sm">Comprar Boxes</Button>
                </Link>
              }
            />
          )
        )}
      </div>
    </div>
  )
}
