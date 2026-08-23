import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Link as LinkIcon, DollarSign, Copy, Check, Search, BarChart3, PieChart as PieChartIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { maskCPF, formatDateTime } from '@/lib/utils'

function useAffiliates() {
  return useQuery({
    queryKey: ['admin', 'affiliates'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_affiliate_stats')
      if (error) throw error
      return data || []
    },
  })
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

export default function AdminAffiliates() {
  const queryClient = useQueryClient()
  const { data: affiliates, isLoading } = useAffiliates()

  useEffect(() => {
    const sub = supabase
      .channel('admin_payments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [queryClient])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newUserCpf, setNewUserCpf] = useState('')
  const [newCode, setNewCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [cpaValue, setCpaValue] = useState(0)
  const [revsharePercentage, setRevsharePercentage] = useState(0)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [viewReferralsAffiliate, setViewReferralsAffiliate] = useState<any>(null)

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    toast.success('Link de indicação copiado!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
    setNewUserCpf('')
    setNewCode('')
    setCpaValue(0)
    setRevsharePercentage(0)
    setEditingUserId(null)
  }

  const openEditModal = (affiliate: any) => {
    setIsAddModalOpen(true)
    setNewUserCpf(affiliate.cpf || affiliate.full_name || 'Já é parceiro') // Display purposes
    setNewCode(affiliate.affiliate_code || '')
    setCpaValue(Number(affiliate.cpa_value) || 0)
    setRevsharePercentage(Number(affiliate.revshare_percentage) || 0)
    setEditingUserId(affiliate.affiliate_id)
  }

  const handleMakeAffiliate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      let userId = editingUserId
      
      if (!userId) {
        if (!newUserCpf || !newCode) throw new Error('Preencha o CPF e o código.')
        const cleanCpf = newUserCpf.replace(/\D/g, '')
        const { data: user, error: findError } = await supabase
          .from('profiles').select('id').eq('cpf', cleanCpf).maybeSingle()
        
        if (findError) throw findError
        if (!user) throw new Error('Usuário não encontrado com este CPF.')
        userId = user.id
      }

      const { error: rpcError } = await supabase.rpc('admin_save_affiliate', {
        p_user_id: userId,
        p_affiliate_code: newCode.trim().toUpperCase(),
        p_cpa_value: Number(cpaValue),
        p_revshare_percentage: Number(revsharePercentage)
      })

      if (rpcError) throw rpcError
      toast.success('Parceiro adicionado com sucesso!')
      setIsAddModalOpen(false)
      setNewUserCpf('')
      setNewCode('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar parceiro')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter affiliates
  const filteredAffiliates = useMemo(() => {
    if (!affiliates) return []
    if (!searchTerm) return affiliates
    const term = searchTerm.toLowerCase()
    return affiliates.filter((a: any) => 
      (a.full_name || '').toLowerCase().includes(term) ||
      (a.email || '').toLowerCase().includes(term) ||
      (a.affiliate_code || '').toLowerCase().includes(term)
    )
  }, [affiliates, searchTerm])

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalSignups = 0
    let totalDepositors = 0
    let totalRevenue = 0
    filteredAffiliates.forEach((a: any) => {
      totalSignups += Number(a.total_referrals || 0)
      totalDepositors += Number(a.depositing_referrals || 0)
      totalRevenue += Number(a.total_deposited || 0)
    })
    const noDepositors = totalSignups - totalDepositors

    // Top 5 by revenue for chart
    const topPartners = [...filteredAffiliates]
      .sort((a, b) => Number(b.total_deposited) - Number(a.total_deposited))
      .slice(0, 5)
      .map(a => ({
        name: a.affiliate_code,
        revenue: Number(a.total_deposited)
      }))

    return { totalSignups, totalDepositors, totalRevenue, noDepositors, topPartners }
  }, [filteredAffiliates])

  const pieData = [
    { name: 'Com Depósito', value: stats.totalDepositors },
    { name: 'Sem Depósito', value: stats.noDepositors },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Parceiros / Afiliados</h1>
          <p className="text-slate-400 text-sm">Dashboard de conversão e gestão de links</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Buscar parceiro ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<UserPlus size={18} />}>
            Adicionar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-surface-700">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <Users size={20} className="text-blue-500" />
                <span className="font-medium uppercase tracking-wider text-xs">Total de Cadastros</span>
              </div>
              <p className="text-3xl font-display font-bold text-white">{stats.totalSignups}</p>
            </Card>
            
            <Card className="p-5 border-surface-700">
              <div className="flex items-center gap-3 text-slate-400 mb-2">
                <UserPlus size={20} className="text-green-500" />
                <span className="font-medium uppercase tracking-wider text-xs">Conversão (Depositantes)</span>
              </div>
              <p className="text-3xl font-display font-bold text-white">
                {stats.totalDepositors}
                <span className="text-sm font-normal text-slate-500 ml-2">
                  ({stats.totalSignups > 0 ? Math.round((stats.totalDepositors / stats.totalSignups) * 100) : 0}%)
                </span>
              </p>
            </Card>

            <Card className="p-5 border-brand-500/30 bg-brand-500/5 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-brand-500/10">
                <DollarSign size={100} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-brand-400 mb-2">
                  <DollarSign size={20} />
                  <span className="font-medium uppercase tracking-wider text-xs">Receita Total Gerada</span>
                </div>
                <p className="text-3xl font-display font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
                </p>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Conversion Pie Chart */}
            <Card className="p-5 border-surface-700">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <PieChartIcon size={18} className="text-slate-400" />
                Qualidade dos Cadastros (Com vs Sem Depósito)
              </h3>
              <div className="h-[250px] w-full">
                {stats.totalSignups > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    Sem dados para exibir
                  </div>
                )}
              </div>
            </Card>

            {/* Top Revenue Bar Chart */}
            <Card className="p-5 border-surface-700">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-400" />
                Top Parceiros por Receita
              </h3>
              <div className="h-[250px] w-full">
                {stats.topPartners.length > 0 && stats.totalRevenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topPartners} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                      <Tooltip 
                        cursor={{ fill: '#334155', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
                    Sem dados de receita
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Detailed List */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Lista de Parceiros</h3>
            {filteredAffiliates.length > 0 ? (
              <div className="space-y-3">
                {filteredAffiliates.map((affiliate: any) => (
                  <Card key={affiliate.affiliate_id} className="p-4 border-surface-700 hover:border-surface-600 transition-colors">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-bold">{affiliate.full_name}</h4>
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-500/20 text-brand-400">
                            {affiliate.affiliate_code}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm">{affiliate.email}</p>
                      </div>

                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Cadastros</p>
                          <p className="text-lg font-bold text-white">{affiliate.total_referrals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Depósitos</p>
                          <p className="text-lg font-bold text-green-400">{affiliate.depositing_referrals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Receita</p>
                          <p className="text-lg font-bold text-brand-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(affiliate.total_deposited))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Comissão</p>
                          <div className="flex flex-col gap-1 text-[10px] mt-1">
                            <span className="bg-surface-800 px-2 py-0.5 rounded border border-surface-700 text-slate-300">
                              CPA: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(affiliate.cpa_value || 0))}
                            </span>
                            <span className="bg-surface-800 px-2 py-0.5 rounded border border-surface-700 text-slate-300">
                              Rev: {Number(affiliate.revshare_percentage || 0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-medium">Ganhos</p>
                          <p className="text-lg font-bold text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(affiliate.total_earnings || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => openEditModal(affiliate)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => setViewReferralsAffiliate(affiliate)}
                        >
                          <Users size={14} className="mr-2 hidden md:block" />
                          Indicações
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 md:flex-none"
                          onClick={() => handleCopyLink(affiliate.affiliate_code)}
                          leftIcon={copiedCode === affiliate.affiliate_code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        >
                          Link
                        </Button>
                      </div>

                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface-900 rounded-xl border border-surface-800">
                <Users size={32} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">Nenhum parceiro encontrado na busca.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Adicionar Parceiro */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Adicionar Parceiro"
      >
        <form onSubmit={handleMakeAffiliate} className="space-y-4">
          <div className="p-4 bg-surface-900 rounded-lg border border-surface-700 text-sm text-slate-300">
            O usuário já deve ter uma conta criada na plataforma. Informe o CPF dele e crie um código de convite único.
          </div>
          
          <Input
            label="CPF do Usuário"
            type="text"
            placeholder="000.000.000-00"
            value={newUserCpf}
            onChange={(e) => setNewUserCpf(maskCPF(e.target.value))}
            required
            disabled={isSubmitting}
          />

          <Input
            label="Código de Convite"
            placeholder="Ex: LUCASVIP"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            required
            disabled={isSubmitting}
            className="uppercase font-bold"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="CPA (R$ por 1º Depósito)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cpaValue}
              onChange={(e) => setCpaValue(Number(e.target.value))}
              disabled={isSubmitting}
            />
            <Input
              label="RevShare (% por Depósito)"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="0"
              value={revsharePercentage}
              onChange={(e) => setRevsharePercentage(Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !newUserCpf || !newCode}>
              {isSubmitting ? 'Salvando...' : 'Adicionar Parceiro'}
            </Button>
          </div>
        </form>
      </Modal>

      {viewReferralsAffiliate && (
        <AffiliateReferralsModal
          isOpen={!!viewReferralsAffiliate}
          onClose={() => setViewReferralsAffiliate(null)}
          affiliateId={viewReferralsAffiliate.affiliate_id}
          affiliateName={viewReferralsAffiliate.full_name}
        />
      )}
    </div>
  )
}

function AffiliateReferralsModal({ 
  isOpen, 
  onClose, 
  affiliateId, 
  affiliateName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  affiliateId: string; 
  affiliateName: string;
}) {
  const queryClient = useQueryClient()
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['admin', 'affiliate-referrals', affiliateId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_affiliate_referrals', { p_affiliate_id: affiliateId })
      if (error) throw error
      return data || []
    },
    enabled: !!affiliateId && isOpen
  })

  useEffect(() => {
    if (!isOpen) return
    const sub = supabase
      .channel('admin_affiliate_referrals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate-referrals', affiliateId] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(sub)
    }
  }, [isOpen, affiliateId, queryClient])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Indicações de ${affiliateName}`}>
      <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-surface-800 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !referrals || referrals.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma indicação"
            description="Este parceiro ainda não possui indicados."
          />
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any) => (
              <div key={ref.user_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-surface-800 rounded-lg border border-surface-700">
                <div>
                  <p className="text-white font-bold text-sm">{ref.full_name}</p>
                  <p className="text-slate-400 text-xs">{ref.email}</p>
                  <p className="text-slate-500 text-[10px] mt-1">{formatDateTime(ref.created_at)}</p>
                </div>
                <div className="mt-2 sm:mt-0 text-right">
                  {ref.has_deposited ? (
                    <div>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold flex items-center gap-1 justify-end w-max ml-auto">
                        <Check size={12} /> Depositou
                      </span>
                      <p className="text-brand-400 text-xs font-bold mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(ref.total_deposited))}
                      </p>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-surface-700 text-slate-400 rounded-full text-xs font-medium inline-block">
                      Sem Depósito
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

