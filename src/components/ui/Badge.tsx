import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'brand' | 'info' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-600 text-slate-300 border border-surface-500/50',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/25',
  gold: 'bg-gold-500/15 text-gold-400 border border-gold-500/30',
  brand: 'bg-brand-500/15 text-brand-400 border border-brand-500/25',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  muted: 'bg-surface-700/50 text-slate-500 border border-surface-600/30',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  gold: 'bg-gold-400',
  brand: 'bg-brand-400',
  info: 'bg-blue-400',
  muted: 'bg-slate-500',
}

export function Badge({
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}

// Status badge helpers
export function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    draft: { variant: 'muted', label: 'Rascunho' },
    active: { variant: 'success', label: 'Ativa' },
    paused: { variant: 'warning', label: 'Pausada' },
    ended: { variant: 'danger', label: 'Encerrada' },
    archived: { variant: 'default', label: 'Arquivada' },
  }
  const { variant, label } = map[status] ?? { variant: 'default' as BadgeVariant, label: status }
  return <Badge variant={variant} dot>{label}</Badge>
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'muted', label: 'Pendente' },
    awaiting_payment: { variant: 'warning', label: 'Aguardando Pagamento' },
    paid: { variant: 'success', label: 'Pago' },
    cancelled: { variant: 'danger', label: 'Cancelado' },
    expired: { variant: 'default', label: 'Expirado' },
    refunded: { variant: 'info', label: 'Reembolsado' },
  }
  const { variant, label } = map[status] ?? { variant: 'default' as BadgeVariant, label: status }
  return <Badge variant={variant} dot>{label}</Badge>
}

export function TicketStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    unrevealed: { variant: 'brand', label: 'Não Revelado' },
    revealed: { variant: 'muted', label: 'Revelado' },
    prize_won: { variant: 'gold', label: '🏆 Premiado' },
    no_prize: { variant: 'default', label: 'Sem Prêmio' },
    draw_participant: { variant: 'info', label: 'No Sorteio' },
    draw_winner: { variant: 'gold', label: '🎉 Vencedor' },
    expired: { variant: 'muted', label: 'Expirado' },
  }
  const { variant, label } = map[status] ?? { variant: 'default' as BadgeVariant, label: status }
  return <Badge variant={variant}>{label}</Badge>
}

export function PrizeClaimStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    won: { variant: 'gold', label: 'Ganho' },
    pending_confirmation: { variant: 'warning', label: 'Aguardando Confirmação' },
    separating: { variant: 'brand', label: 'Em Separação' },
    shipped: { variant: 'info', label: 'Enviado' },
    delivered: { variant: 'success', label: 'Entregue' },
    cancelled: { variant: 'danger', label: 'Cancelado' },
  }
  const { variant, label } = map[status] ?? { variant: 'default' as BadgeVariant, label: status }
  return <Badge variant={variant} dot>{label}</Badge>
}
