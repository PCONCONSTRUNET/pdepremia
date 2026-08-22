import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Trophy, Calendar, Check, AlertCircle, Sparkles, X, Wallet, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage, EmptyState } from '@/components/common/Loading'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'

export default function PublicSorteios() {
  const [tab, setTab] = useState<'disponiveis' | 'finalizados'>('disponiveis')
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [buyingCampaign, setBuyingCampaign] = useState<any>(null)
  const [ticketQuantity, setTicketQuantity] = useState<number>(1)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['public', 'sorteios', tab],
    queryFn: async () => {
      const statusFilter = tab === 'disponiveis' ? 'active' : 'finished'
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          draws (
            id, winner_user_id, result_ticket_number,
            winner:profiles!draws_winner_user_id_fkey ( full_name )
          ),
          prizes (
            id, name, prize_type, image_url, created_at
          ),
          tickets ( user_id )
        `)
        .eq('status', statusFilter)
        .order('end_date', { ascending: tab === 'disponiveis' })

      if (error) throw error
      return data
    }
  })

  const { data: userTickets } = useQuery({
    queryKey: ['public', 'user-tickets', profile?.id],
    queryFn: async () => {
      if (!profile) return []
      const { data, error } = await supabase.from('tickets').select('campaign_id').eq('user_id', profile.id)
      if (error) throw error
      return data.map(t => t.campaign_id)
    },
    enabled: !!profile
  })

  const buyTicketMutation = useMutation({
    mutationFn: async ({ campaign, quantity }: { campaign: any, quantity: number }) => {
      if (!profile) throw new Error('Você precisa estar logado para participar')
      const totalAmount = campaign.ticket_price * quantity
      if ((profile as any)?.balance < totalAmount) throw new Error('Saldo insuficiente')

      // Buy tickets securely via RPC
      const { error: rpcErr } = await supabase.rpc('buy_campaign_tickets_with_wallet', { 
        p_campaign_id: campaign.id,
        p_quantity: quantity
      })

      if (rpcErr) throw rpcErr
    },
    onSuccess: () => {
      toast.success('Participação confirmada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['public', 'user-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
      setBuyingCampaign(null)
      setTicketQuantity(1)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao participar do sorteio')
    }
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="min-h-screen bg-surface-950 pt-24 pb-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full pointer-events-none opacity-50" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 mb-6 border border-brand-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <Ticket size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Sorteios Exclusivos
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Participe dos nossos sorteios e concorra a prêmios incríveis. 
            Escolha sua campanha, garanta seu bilhete e boa sorte!
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-surface-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-xl">
            <button
              onClick={() => setTab('disponiveis')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'disponiveis' 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25' 
                  : 'text-slate-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              Sorteios Ativos
            </button>
            <button
              onClick={() => setTab('finalizados')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'finalizados' 
                  ? 'bg-surface-700 text-white shadow-lg shadow-black/20' 
                  : 'text-slate-400 hover:text-white hover:bg-surface-800'
              }`}
            >
              Resultados
            </button>
          </div>
        </div>

        {campaigns?.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/5">
            <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-slate-500" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mb-2">
              {tab === 'disponiveis' ? 'Nenhum sorteio no momento' : 'Nenhum resultado ainda'}
            </h3>
            <p className="text-slate-400">
              {tab === 'disponiveis' 
                ? 'Fique de olho, novidades estão sendo preparadas para você!' 
                : 'Os resultados dos sorteios finalizados aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns?.map((campaign, i) => {
              const hasParticipated = userTickets?.includes(campaign.id)
              const typeLabel = campaign.type ? campaign.type.charAt(0).toUpperCase() + campaign.type.slice(1) : 'Sorteio'
              const mainPrize = campaign.prizes?.[0]
              
              // Count unique participants
              const uniqueParticipants = campaign.tickets ? new Set(campaign.tickets.map((t: any) => t.user_id)).size : 0
              
              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group"
                >
                  <div className="relative h-full glass rounded-3xl overflow-hidden border border-white/10 hover:border-brand-500/50 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(99,102,241,0.15)] flex flex-col">
                    
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity z-20" />

                    {/* Cover Banner */}
                    <div className="h-32 sm:h-48 relative overflow-hidden bg-surface-900 flex items-center justify-center">
                      {campaign.banner_url ? (
                        <img 
                          src={campaign.banner_url} 
                          alt={campaign.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                          <Gift size={40} className="text-brand-400/50 sm:w-12 sm:h-12" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 flex-1 flex flex-col relative z-10">
                      
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4 sm:mb-6">
                        <div className="px-3 py-1 rounded-lg bg-surface-800/80 border border-white/5 text-xs font-bold text-slate-300 backdrop-blur-md uppercase tracking-wider">
                          {typeLabel}
                        </div>
                        {hasParticipated && (
                          <div className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <Check size={12} strokeWidth={3} />
                            Participando
                          </div>
                        )}
                      </div>

                      {/* Prize List */}
                      <div className="flex-1 flex flex-col items-center text-center mb-4 sm:mb-6">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-brand-400/20 to-purple-500/20 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">
                          {mainPrize?.image_url ? (
                            <img src={mainPrize.image_url} alt={mainPrize.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
                          ) : (
                            <Trophy size={24} className="text-brand-400 sm:w-7 sm:h-7" />
                          )}
                        </div>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-white leading-tight mb-3 sm:mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-brand-300 group-hover:to-purple-300 transition-colors">
                          {campaign.name}
                        </h3>
                        
                        {/* Render all prizes */}
                        {campaign.prizes && campaign.prizes.length > 0 ? (
                          <div className="w-full space-y-2 mt-auto">
                            {campaign.prizes.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((p: any, idx: number) => (
                              <div key={p.id} className="flex items-center gap-3 text-sm text-slate-300 bg-surface-900/50 px-3 py-2 rounded-xl border border-white/5">
                                <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="truncate font-medium text-left flex-1">{p.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm italic mt-auto">Nenhum prêmio cadastrado</p>
                        )}
                      </div>

                      {/* Info Footer */}
                      <div className="space-y-4 mt-auto">
                        <div className="flex items-center justify-between text-sm py-3 border-y border-white/5">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar size={14} />
                            <span>{tab === 'disponiveis' ? 'Sorteio em:' : 'Sorteado em:'}</span>
                          </div>
                          <span className="text-white font-medium">
                            {format(new Date(campaign.end_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm py-3 border-b border-white/5 mb-2">
                          <span className="text-slate-400">Participantes:</span>
                          <span className="text-brand-400 font-bold bg-brand-500/10 px-2 py-0.5 rounded-md">
                            {uniqueParticipants} {uniqueParticipants === 1 ? 'jogador' : 'jogadores'}
                          </span>
                        </div>

                        {tab === 'finalizados' && (
                          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 text-center mb-4">
                            <p className="text-xs text-brand-300 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                              <Sparkles size={14} /> Grande Ganhador
                            </p>
                            {campaign.draws && campaign.draws.length > 0 ? (
                              <p className="text-white font-display font-bold text-lg">
                                {(campaign.draws[0] as any).winner?.full_name || 'Usuário Oculto'}
                              </p>
                            ) : (
                              <p className="text-slate-400 text-sm italic">Sorteio em apuração...</p>
                            )}
                          </div>
                        )}

                        {(!hasParticipated && tab === 'finalizados') ? null : (
                          <div className="flex flex-col gap-2">
                            <Button 
                              className={`w-full h-12 text-base font-bold shadow-lg transition-all ${
                                tab === 'finalizados'
                                  ? 'bg-surface-800 text-white hover:bg-surface-700 border-surface-600' 
                                  : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-500/25'
                              }`}
                              onClick={() => {
                                if (tab === 'finalizados') navigate('/meus-bilhetes')
                                else {
                                  if (!profile) {
                                    toast.error('Você precisa estar logado para participar!')
                                    navigate('/register')
                                    return
                                  }
                                  setTicketQuantity(1)
                                  setBuyingCampaign(campaign)
                                }
                              }}
                            >
                              {tab === 'finalizados' ? 'Ver meus bilhetes' : (hasParticipated ? 'Comprar Mais Bilhetes' : `Participar por ${formatCurrency(campaign.ticket_price)}`)}
                            </Button>
                            {hasParticipated && tab !== 'finalizados' && (
                              <Button 
                                variant="outline"
                                className="w-full border-surface-600 text-slate-300 hover:bg-surface-800"
                                onClick={() => navigate('/meus-bilhetes')}
                              >
                                Ver Meus Bilhetes
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Premium Buy Modal */}
      <AnimatePresence>
        {buyingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
              onClick={() => !buyTicketMutation.isPending && setBuyingCampaign(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative h-20 sm:h-32 bg-gradient-to-br from-brand-600 to-purple-600 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => !buyTicketMutation.isPending && setBuyingCampaign(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors backdrop-blur-md"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="absolute -bottom-4 sm:-bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-900 flex items-center justify-center shadow-xl border border-surface-700 rotate-12">
                  <Ticket size={24} className="text-brand-400 -rotate-12 sm:w-8 sm:h-8" />
                </div>
              </div>

              <div className="pt-6 sm:pt-10 px-4 sm:px-6 pb-4 sm:pb-6 text-center">
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1 sm:mb-2">
                  Confirmar Participação
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                  Você está prestes a adquirir um bilhete para o sorteio <strong className="text-white">{buyingCampaign.name}</strong>.
                </p>

                <div className="bg-surface-950 border border-surface-800 rounded-2xl p-4 mb-6">
                  {buyingCampaign.prizes && buyingCampaign.prizes.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-left">Prêmios deste Sorteio</p>
                      {buyingCampaign.prizes.map((p: any, idx: number) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm text-left">
                          <span className="text-brand-400 font-bold">{idx + 1}º</span>
                          <span className="text-slate-300 truncate">{p.name}</span>
                        </div>
                      ))}
                      <div className="h-px bg-surface-800 w-full mt-3 mb-1" />
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-3 text-sm mt-2">
                    <span className="text-slate-400">Valor do Bilhete</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(buyingCampaign.ticket_price)}</span>
                  </div>
                  
                  <div className="h-px bg-surface-800 w-full mb-3" />
                  
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-slate-400">Quantidade de Bilhetes</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                        className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-white hover:bg-surface-700"
                      >-</button>
                      <span className="font-bold text-lg w-4 text-center">{ticketQuantity}</span>
                      <button 
                        onClick={() => setTicketQuantity(ticketQuantity + 1)}
                        className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-white hover:bg-surface-700"
                      >+</button>
                    </div>
                  </div>

                  <div className="h-px bg-surface-800 w-full mb-3" />

                  <div className="flex justify-between items-center mb-3 text-sm mt-2">
                    <span className="text-slate-400">Total a Pagar</span>
                    <span className="text-brand-400 font-bold text-xl">{formatCurrency(buyingCampaign.ticket_price * ticketQuantity)}</span>
                  </div>
                  
                  <div className="h-px bg-surface-800 w-full mb-3" />
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Wallet size={14} />
                      <span>Saldo Atual</span>
                    </div>
                    <span className={`font-medium ${((profile as any)?.balance || 0) >= (buyingCampaign.ticket_price * ticketQuantity) ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency((profile as any)?.balance || 0)}
                    </span>
                  </div>
                </div>

                {((profile as any)?.balance || 0) < (buyingCampaign.ticket_price * ticketQuantity) && (
                  <div className="mb-4 sm:mb-6 p-2 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-start gap-2 text-left">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 sm:w-4 sm:h-4" />
                    <span>Seu saldo é insuficiente. Recarregue.</span>
                  </div>
                )}

                <Button
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold shadow-lg shadow-brand-500/20"
                  onClick={() => buyTicketMutation.mutate({ campaign: buyingCampaign, quantity: ticketQuantity })}
                  disabled={buyTicketMutation.isPending || ((profile as any)?.balance || 0) < (buyingCampaign.ticket_price * ticketQuantity)}
                  isLoading={buyTicketMutation.isPending}
                >
                  Confirmar e Participar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
