import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ShoppingCart, Search, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge, OrderStatusBadge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function useOrders() {
  return useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, campaign:campaigns(name), user:profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
}

export default function AdminOrders() {
  const { data: orders, isLoading } = useOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = orders?.filter((o) => {
    const matchSearch = !search ||
      (o as any).user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      (o as any).campaign?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const statuses = ['all', 'pending', 'awaiting_payment', 'paid', 'cancelled', 'expired']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Pedidos</h1>
        <p className="text-slate-400 text-sm">Histórico completo de pedidos</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por participante ou campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-brand-500/20 border border-brand-500/40 text-brand-400'
                  : 'bg-surface-700/50 border border-surface-600/40 text-slate-400'
              }`}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Card key={order.id} className="hover:border-surface-500/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium text-sm">{(order as any).user?.full_name}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-slate-500 text-xs">{(order as any).campaign?.name}</p>
                  <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
                    <span>🎫 {order.quantity} bilhetes</span>
                    <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                </div>
                <p className="font-display font-bold text-white text-xl shrink-0">
                  {formatCurrency(order.total_amount)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ShoppingCart size={28} />}
          title="Nenhum pedido encontrado"
          description="Os pedidos aparecerão aqui conforme os participantes fizerem suas compras."
        />
      )}
    </div>
  )
}
