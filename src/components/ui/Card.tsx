import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'bordered' | 'prize'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const variantClasses = {
  default: 'bg-surface-800 border border-surface-600/50',
  glass: 'glass',
  elevated: 'bg-surface-800 border border-surface-600/30 shadow-xl shadow-surface-950/50',
  bordered: 'bg-surface-800/50 border border-surface-500/30',
  prize:
    'bg-gradient-to-br from-surface-800 to-surface-900 border border-gold-500/20 shadow-lg shadow-gold-900/10',
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        variantClasses[variant],
        paddingClasses[padding],
        hoverable && 'cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-brand-500/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Card sub-components
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display font-semibold text-white text-lg', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pt-4 mt-4 border-t border-surface-600/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
