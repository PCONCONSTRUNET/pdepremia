import { cn } from '@/lib/utils'

// ─── Skeleton ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  const roundedClasses = {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }
  return <div className={cn('skeleton', roundedClasses[rounded], className)} />
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }
  return (
    <div
      className={cn(
        'rounded-full border-brand-500/30 border-t-brand-500 animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}

// ─── Loading Page ────────────────────────────────────────────────────────────

export function LoadingPage({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-brand-500/20 border-t-brand-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">🎯</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center mb-4 text-2xl">
          {icon}
        </div>
      )}
      <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>}
      {action && action}
    </div>
  )
}

// ─── Error State ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Ocorreu um erro inesperado. Tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-2xl">
        ⚠️
      </div>
      <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Tentar Novamente
        </button>
      )}
    </div>
  )
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="bg-surface-800 border border-surface-600/50 rounded-2xl p-5 space-y-4">
      <Skeleton className="h-48 w-full" rounded="lg" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" rounded="full" />
        <Skeleton className="h-8 w-24" rounded="full" />
      </div>
      <Skeleton className="h-10 w-full" rounded="lg" />
    </div>
  )
}
