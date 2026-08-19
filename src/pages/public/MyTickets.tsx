import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket, Filter, Search, Star, Trophy, Clock, Gift, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatTicketNumber, formatDate, formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, TicketStatusBadge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import { Modal } from '@/components/ui/Modal'
import type { Ticket as TicketType, Prize } from '@/types'

function useMyTickets() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['tickets', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, campaign:campaigns(id, name, slug), prize:prizes(id, name, prize_type, reference_value, image_url)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })
}

// Reveal animation modal
function RevealModal({
  isOpen,
  onClose,
  result,
}: {
  isOpen: boolean
  onClose: () => void
  result: { has_prize: boolean; prize?: any } | null
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <AnimatePresence>
        {isOpen && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            {result.has_prize ? (
              <>
                <motion.div
                  initial={{ rotate: -10, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  className="text-6xl mb-4"
                >
                  🏆
                </motion.div>
                <h3 className="font-display font-bold text-white text-2xl mb-2">
                  Parabéns! Você ganhou!
                </h3>
                <p className="text-gold-400 font-semibold text-lg mb-1">
                  {result.prize?.name}
                </p>
                {result.prize?.reference_value && (
                  <p className="text-slate-400 text-sm mb-4">
                    Valor ref.: {formatCurrency(result.prize.reference_value)}
                  </p>
                )}
                <p className="text-slate-500 text-xs mb-6">
                  Seu prêmio foi registrado em "Meus Prêmios"
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                  className="text-6xl mb-4"
                >
                  🎫
                </motion.div>
                <h3 className="font-display font-semibold text-white text-xl mb-2">
                  Bilhete revelado
                </h3>
                <p className="text-slate-400 text-sm mb-6">
                  Desta vez não foi. Continue participando!
                </p>
              </>
            )}
            <Button variant={result.has_prize ? 'gold' : 'secondary'} onClick={onClose} className="w-full">
              {result.has_prize ? 'Ver meus prêmios' : 'Continuar'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

// Single ticket card
function TicketCard({
  ticket,
  onReveal,
  isRevealing,
}: {
  ticket: any
  onReveal: (id: string) => void
  isRevealing: boolean
}) {
  const canReveal = ticket.ticket_type === 'instant_prize' && ticket.status === 'unrevealed'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card
        className={`relative overflow-hidden ${
          ticket.status === 'prize_won'
            ? 'border-gold-500/30 bg-gradient-to-br from-surface-800 to-surface-900'
            : ''
        }`}
      >
        {ticket.status === 'prize_won' && (
          <div className="absolute inset-0 shine-effect opacity-20" />
        )}

        <div className="relative space-y-3">
          {/* Number + Status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Nº do bilhete</p>
              <p className="font-mono font-bold text-white text-xl">
                {formatTicketNumber(ticket.ticket_number)}
              </p>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>

          {/* Campaign */}
          <div>
            <p className="text-slate-500 text-xs">Campanha</p>
            <p className="text-slate-300 text-sm font-medium">{ticket.campaign?.name}</p>
          </div>

          {/* Prize (if won) */}
          {ticket.prize && ticket.status === 'prize_won' && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-gold-500/10 border border-gold-500/20">
              <Trophy size={14} className="text-gold-400 shrink-0" />
              <span className="text-gold-400 text-xs font-medium">{ticket.prize.name}</span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(ticket.created_at)}
            </div>
            {ticket.ticket_type !== 'common' && (
              <Badge variant="brand" size="sm">
                {ticket.ticket_type === 'instant_prize' ? '⚡ Instantâneo' : ticket.ticket_type}
              </Badge>
            )}
          </div>

          {/* Reveal button */}
          {canReveal && (
            <Button
              variant="gold"
              size="sm"
              className="w-full"
              isLoading={isRevealing}
              leftIcon={<Sparkles size={14} />}
              onClick={() => onReveal(ticket.id)}
            >
              Revelar Bilhete
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default function MyTickets() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: tickets, isLoading } = useMyTickets()
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [revealResult, setRevealResult] = useState<any>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)

  const revealMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data, error } = await supabase.functions.invoke('reveal-ticket', {
        body: { ticket_id: ticketId },
      })
      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      setRevealResult(result)
      setIsResultModalOpen(true)
      queryClient.invalidateQueries({ queryKey: ['tickets', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['prizes', 'mine'] })
    },
    onError: () => {
      toast.error('Erro ao revelar bilhete. Tente novamente.')
    },
  })

  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'unrevealed', label: 'Não Revelados' },
    { value: 'prize_won', label: 'Premiados' },
    { value: 'draw_participant', label: 'No Sorteio' },
  ]

  const filteredTickets = tickets?.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false
    if (search && !t.ticket_number.includes(search)) return false
    return true
  })

  const stats = tickets
    ? {
        total: tickets.length,
        unrevealed: tickets.filter((t) => t.status === 'unrevealed').length,
        prize_won: tickets.filter((t) => t.status === 'prize_won').length,
        draw: tickets.filter((t) => t.status === 'draw_participant').length,
      }
    : null

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-white text-2xl sm:text-3xl flex items-center gap-3">
            <Ticket className="text-brand-400" />
            Meus Bilhetes
          </h1>
          <p className="text-slate-400 mt-1">Sua carteira de participações</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, icon: <Ticket size={18} className="text-brand-400" />, variant: 'brand' },
              { label: 'Não revelados', value: stats.unrevealed, icon: <Star size={18} className="text-gold-400" />, variant: 'gold' },
              { label: 'Premiados', value: stats.prize_won, icon: <Trophy size={18} className="text-emerald-400" />, variant: 'success' },
              { label: 'No sorteio', value: stats.draw, icon: <Gift size={18} className="text-blue-400" />, variant: 'info' },
            ].map((s) => (
              <Card key={s.label} variant="glass" padding="sm" className="text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="font-display font-bold text-white text-xl">{s.value}</p>
                <p className="text-slate-500 text-xs">{s.label}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  filter === f.value
                    ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                    : 'bg-surface-700/50 border border-surface-600/40 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onReveal={(id) => revealMutation.mutate(id)}
                  isRevealing={revealMutation.isPending && revealMutation.variables === ticket.id}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <EmptyState
            icon={<Ticket size={28} />}
            title="Nenhum bilhete encontrado"
            description={
              filter !== 'all'
                ? 'Nenhum bilhete encontrado com esse filtro.'
                : 'Você ainda não possui bilhetes. Participe de uma campanha!'
            }
            action={
              filter !== 'all' ? (
                <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                  Ver todos
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => window.location.href = '/'}>
                  Ver Campanhas
                </Button>
              )
            }
          />
        )}
      </div>

      <RevealModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        result={revealResult}
      />
    </div>
  )
}
