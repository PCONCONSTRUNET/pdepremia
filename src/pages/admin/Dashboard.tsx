import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Users, ShoppingCart, CreditCard, Ticket, Trophy, Megaphone,
  TrendingUp, Clock, ChevronRight, ArrowUpRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime, maskName } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, OrderStatusBadge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/common/Loading'

function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: async () => {
      const [
        { count: users },
        { count: orders },
        { count: paidOrders },
        { count: tickets },
        { count: prizes },
        { data: paidOrdersData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('winners').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').eq('status', 'paid'),
      ])

      const revenue = paidOrdersData?.reduce((acc, o) => acc + (o.total_amount || 0), 0) || 0

      return {
        users: users || 0,
        orders: orders || 0,
        paid_orders: paidOrders || 0,
        tickets: tickets || 0,
        prizes_distributed: prizes || 0,
        revenue,
      }
    },
  })
}

function useRecentOrders() {
  return useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, campaign:campaigns(name), user:profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data
    },
  })
}

function useRecentWinners() {
  return useQuery({
    queryKey: ['admin', 'recent-winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, prize:prizes(name), campaign:campaigns(name), user:profiles(full_name)')
        .order('won_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data
    },
  })
}

// Stat card
function StatCard({
  label,
  value,
  icon,
  color,
  trend,
  link,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  trend?: string
  link?: string
}) {
  const content = (
    <Card hoverable={!!link} className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 -translate-y-6 translate-x-6 ${color}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl bg-surface-700/50 flex items-center justify-center ${color.replace('bg-', 'text-')}`}>
            {icon}
          </div>
          {link && <ChevronRight size={16} className="text-slate-600" />}
        </div>
        <p className="font-display font-bold text-white text-2xl mb-1">{value}</p>
        <p className="text-slate-500 text-sm">{label}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-2 text-emerald-400 text-xs">
            <TrendingUp size={12} />
            {trend}
          </div>
        )}
      </div>
    </Card>
  )

  return link ? <Link to={link}>{content}</Link> : content
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: orders, isLoading: ordersLoading } = useRecentOrders()
  const { data: winners, isLoading: winnersLoading } = useRecentWinners()

  const statCards = stats
    ? [
        {
          label: 'Usuários',
          value: stats.users.toLocaleString('pt-BR'),
          icon: <Users size={20} />,
          color: 'bg-blue-500',
          link: '/admin/usuarios',
        },
        {
          label: 'Pedidos',
          value: stats.orders.toLocaleString('pt-BR'),
          icon: <ShoppingCart size={20} />,
          color: 'bg-brand-500',
          link: '/admin/pedidos',
        },
        {
          label: 'Pagamentos Aprovados',
          value: stats.paid_orders.toLocaleString('pt-BR'),
          icon: <CreditCard size={20} />,
          color: 'bg-emerald-500',
          link: '/admin/pagamentos',
        },
        {
          label: 'Receita Total',
          value: formatCurrency(stats.revenue),
          icon: <TrendingUp size={20} />,
          color: 'bg-gold-500',
        },
        {
          label: 'Bilhetes Gerados',
          value: stats.tickets.toLocaleString('pt-BR'),
          icon: <Ticket size={20} />,
          color: 'bg-violet-500',
          link: '/admin/bilhetes',
        },
        {
          label: 'Prêmios Distribuídos',
          value: stats.prizes_distributed.toLocaleString('pt-BR'),
          icon: <Trophy size={20} />,
          color: 'bg-amber-500',
          link: '/admin/ganhadores',
        },
      ]
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral da plataforma</p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard {...s} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Últimos Pedidos</CardTitle>
              <Link
                to="/admin/pedidos"
                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
              >
                Ver todos <ArrowUpRight size={14} />
              </Link>
            </CardHeader>

            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 skeleton rounded-xl" />
                ))}
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/30 hover:bg-surface-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {(order as any).user?.full_name || 'Usuário'}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {(order as any).campaign?.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-semibold">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Nenhum pedido ainda</p>
            )}
          </Card>
        </div>

        {/* Recent Winners */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Últimos Ganhadores</CardTitle>
              <Link
                to="/admin/ganhadores"
                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
              >
                Ver <ArrowUpRight size={14} />
              </Link>
            </CardHeader>

            {winnersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 skeleton rounded-xl" />
                ))}
              </div>
            ) : winners && winners.length > 0 ? (
              <div className="space-y-2">
                {winners.map((winner) => (
                  <div key={winner.id} className="flex items-center gap-3 p-3 rounded-xl bg-gold-500/5 border border-gold-500/10">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/15 flex items-center justify-center shrink-0">
                      <Trophy size={14} className="text-gold-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">
                        {maskName((winner as any).user?.full_name || 'Usuário')}
                      </p>
                      <p className="text-slate-500 text-xs truncate">
                        {(winner as any).prize?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">Nenhum ganhador ainda</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
