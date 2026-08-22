import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/common/Loading'
import { format, subDays, startOfDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

type DateFilter = 'today' | '7d' | '30d' | 'all'

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4']

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d')

  // Calculate the minimum date based on the filter
  const getMinDate = () => {
    const today = new Date()
    switch (dateFilter) {
      case 'today':
        return startOfDay(today)
      case '7d':
        return subDays(startOfDay(today), 6) // 6 days ago + today = 7 days
      case '30d':
        return subDays(startOfDay(today), 29)
      case 'all':
        return new Date(0) // Start of time
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard-igaming', dateFilter],
    queryFn: async () => {
      const minDate = getMinDate()
      const minDateStr = minDate.toISOString()

      // Fetch Paid Orders (Deposits/Sales)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, status, user_id, campaign:campaigns(name), user:profiles(full_name)')
        .eq('status', 'paid')
        .gte('created_at', minDateStr)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch Approved Withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('id, amount, created_at, status, user_id, profiles:user_id(full_name)')
        .eq('status', 'approved')
        .gte('created_at', minDateStr)
        .order('created_at', { ascending: false })

      if (withdrawalsError) {
        console.error('Withdrawals Error:', withdrawalsError)
        throw withdrawalsError
      }

      // Process Data
      const orders = ordersData || []
      const withdrawals = withdrawalsData || []

      // Metrics
      const totalDeposits = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
      const ggr = totalDeposits - totalWithdrawals

      // Active Users (Unique users who deposited or withdrew)
      const uniqueUsers = new Set([...orders.map(o => o.user_id), ...withdrawals.map(w => w.user_id)])
      const activeUsersCount = uniqueUsers.size

      // Chart Data: Group by Date (for Area Chart)
      const chartDataMap = new Map<string, { date: string; timestamp: number; deposits: number; withdrawals: number; ggr: number }>()
      
      // Initialize map based on date range if not 'all' to ensure empty days are shown
      if (dateFilter !== 'all') {
        const days = dateFilter === 'today' ? 1 : dateFilter === '7d' ? 7 : 30
        for (let i = days - 1; i >= 0; i--) {
          const d = subDays(new Date(), i)
          const dateStr = format(d, 'dd/MM', { locale: ptBR })
          chartDataMap.set(dateStr, { date: dateStr, timestamp: startOfDay(d).getTime(), deposits: 0, withdrawals: 0, ggr: 0 })
        }
      }

      const processEntry = (dateString: string, amount: number, isDeposit: boolean) => {
        const d = parseISO(dateString)
        const dateStr = format(d, 'dd/MM', { locale: ptBR })
        if (!chartDataMap.has(dateStr)) {
          chartDataMap.set(dateStr, { date: dateStr, timestamp: startOfDay(d).getTime(), deposits: 0, withdrawals: 0, ggr: 0 })
        }
        const entry = chartDataMap.get(dateStr)!
        if (isDeposit) {
          entry.deposits += amount
          entry.ggr += amount
        } else {
          entry.withdrawals += amount
          entry.ggr -= amount
        }
      }

      orders.forEach(o => processEntry(o.created_at, Number(o.total_amount), true))
      withdrawals.forEach(w => processEntry(w.created_at, Number(w.amount), false))

      const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.timestamp - b.timestamp)

      // Donut Chart: Sales by Campaign
      const campaignMap = new Map<string, number>()
      orders.forEach(o => {
        const campaignName = (o as any).campaign?.name || 'Venda Avulsa / Diversos'
        campaignMap.set(campaignName, (campaignMap.get(campaignName) || 0) + Number(o.total_amount))
      })
      const donutData = Array.from(campaignMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // Top 5

      // Live Feed (Merge Orders and Withdrawals, sort by date)
      const liveFeed = [
        ...orders.map(o => ({ ...o, type: 'deposit' as const, amount: o.total_amount, user_name: (o as any).user?.full_name })),
        ...withdrawals.map(w => ({ ...w, type: 'withdrawal' as const, amount: w.amount, user_name: (w as any).profiles?.full_name }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 15) // Show last 15 actions

      return {
        totalDeposits,
        totalWithdrawals,
        ggr,
        activeUsersCount,
        chartData,
        donutData,
        liveFeed
      }
    }
  })

  // Error boundary logic
  if (data === undefined && !isLoading) {
    return (
      <div className="p-8 text-center bg-surface-900 border border-red-500/20 rounded-xl">
        <h2 className="text-red-400 font-bold mb-2">Erro ao carregar Dashboard</h2>
        <p className="text-slate-400 text-sm">Ocorreu um erro ao buscar os dados do painel. Verifique o console.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">
          Recarregar Página
        </button>
      </div>
    )
  }

  // Render KPI Card
  const renderKpi = (title: string, value: string, icon: React.ReactNode, colorClass: string, isNegative: boolean = false) => (
    <Card className="relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity -translate-y-6 translate-x-6 ${colorClass.split(' ')[0]}`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-slate-400 font-medium text-sm">{title}</h3>
        <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-display font-bold relative z-10 ${isNegative ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
    </Card>
  )

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-900 border border-surface-700 p-3 rounded-lg shadow-xl z-50 relative">
          <p className="text-slate-300 mb-2 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-400">{entry.name}:</span>
              <span className="text-white font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-2">
            <Activity className="text-brand-400" />
            iGaming Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Visão financeira e estatísticas em tempo real</p>
        </div>

        <div className="flex items-center bg-surface-900 border border-white/5 rounded-xl p-1">
          {(['today', '7d', '30d', 'all'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateFilter === filter 
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter === 'today' ? 'Hoje' : filter === '7d' ? '7 Dias' : filter === '30d' ? '30 Dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {renderKpi('GGR (Lucro Líquido)', formatCurrency(data.ggr), <DollarSign size={16} />, 'bg-brand-500 text-white', data.ggr < 0)}
            {renderKpi('Total de Entradas', formatCurrency(data.totalDeposits), <ArrowDownLeft size={16} />, 'bg-emerald-500 text-white')}
            {renderKpi('Total de Saques', formatCurrency(data.totalWithdrawals), <ArrowUpRight size={16} />, 'bg-red-500 text-white')}
            {renderKpi('Usuários Ativos (Período)', data.activeUsersCount.toLocaleString('pt-BR'), <Users size={16} />, 'bg-blue-500 text-white')}
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart - Financial Evolution */}
            <Card className="lg:col-span-2 p-5 border-white/5 bg-surface-900">
              <CardHeader className="px-0 pt-0 pb-6">
                <CardTitle className="text-lg font-display">Evolução Financeira</CardTitle>
              </CardHeader>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGGR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                      dx={-10}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff1a', strokeWidth: 2 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="ggr" name="GGR (Lucro)" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorGGR)" />
                    <Area type="monotone" dataKey="deposits" name="Entradas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDeposits)" />
                    <Area type="monotone" dataKey="withdrawals" name="Saques" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorWithdrawals)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Donut Chart - Sales by Campaign */}
            <Card className="p-5 border-white/5 bg-surface-900">
              <CardHeader className="px-0 pt-0 pb-6">
                <CardTitle className="text-lg font-display">Vendas por Sorteio</CardTitle>
              </CardHeader>
              <div className="h-[320px] w-full flex flex-col items-center justify-center">
                {data.donutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.donutData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend 
                        iconType="circle" 
                        layout="vertical" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ fontSize: '12px', paddingtop: '20px' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-sm text-center">Dados insuficientes para o período</div>
                )}
              </div>
            </Card>
          </div>

          {/* Live Feed Table */}
          <Card className="border-white/5 bg-surface-900">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                Feed Ao Vivo (Transações Recentes)
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400">
                    <th className="text-left font-medium py-4 px-6">Tipo</th>
                    <th className="text-left font-medium py-4 px-6">Usuário</th>
                    <th className="text-right font-medium py-4 px-6">Valor</th>
                    <th className="text-right font-medium py-4 px-6">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.liveFeed.length > 0 ? (
                    data.liveFeed.map((item, i) => (
                      <motion.tr 
                        key={`${item.type}-${item.id}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 px-6">
                          {item.type === 'deposit' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs font-medium">
                              <ArrowDownLeft size={14} /> Nova Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-400 bg-red-400/10 px-2.5 py-1 rounded-md text-xs font-medium">
                              <ArrowUpRight size={14} /> Saque Realizado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-white font-medium">
                          {item.user_name || 'Usuário Desconhecido'}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className={`font-mono font-medium ${item.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.type === 'deposit' ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right text-slate-500">
                          {formatDateTime(item.created_at)}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        Nenhuma transação no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
