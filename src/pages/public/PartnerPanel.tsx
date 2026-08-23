import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, Navigate } from 'react-router-dom'
import { 
  Users, UserPlus, DollarSign, Copy, Check, 
  TrendingUp, Activity, CheckCircle2, XCircle, FileText, Percent
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingPage, CardSkeleton, EmptyState } from '@/components/common/Loading'
import { formatDateTime } from '@/lib/utils'

function usePartnerStats() {
  return useQuery({
    queryKey: ['partner', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_affiliate_stats')
      if (error) throw error
      return data?.[0] || null
    }
  })
}

function usePartnerReferrals() {
  return useQuery({
    queryKey: ['partner', 'referrals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_referrals')
      if (error) throw error
      return data || []
    }
  })
}

export default function PartnerPanel() {
  const { profile, isLoading: isAuthLoading } = useAuth()
  const [copiedLink, setCopiedLink] = useState(false)

  const { data: stats, isLoading: isStatsLoading } = usePartnerStats()
  const { data: referrals, isLoading: isReferralsLoading } = usePartnerReferrals()

  if (isAuthLoading) return <LoadingPage />

  // If user is not an affiliate, show a message
  if (!profile?.is_affiliate) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-surface-900 border-surface-800">
          <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={32} className="text-brand-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Seja um Parceiro</h2>
          <p className="text-slate-400 mb-6">
            Você ainda não é um parceiro da plataforma. Entre em contato com o suporte para ativar sua conta de afiliado e começar a lucrar com indicações!
          </p>
          <Link to="/">
            <Button className="w-full">Voltar para o Início</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const handleCopy = () => {
    if (!stats?.affiliate_code) return
    const link = `${window.location.origin}/${stats.affiliate_code}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    toast.success('Link copiado com sucesso!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const isLoading = isStatsLoading || isReferralsLoading

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Painel do Parceiro</h1>
          <p className="text-slate-400">Acompanhe os resultados das suas indicações em tempo real.</p>
        </div>

        {/* Link Box */}
        {stats?.affiliate_code && (
          <div className="bg-surface-900 border border-brand-500/30 rounded-xl p-4 flex flex-col gap-2 w-full md:w-auto">
            <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">Seu Link de Indicação</span>
            <div className="flex items-center gap-2">
              <code className="bg-surface-950 px-3 py-2 rounded-lg text-sm text-slate-300 font-mono border border-surface-800 select-all">
                {window.location.origin}/{stats.affiliate_code}
              </code>
              <Button variant="brand" size="sm" onClick={handleCopy} leftIcon={copiedLink ? <Check size={16} /> : <Copy size={16} />}>
                {copiedLink ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Contract Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
              <div className="flex items-center gap-3 text-center md:text-left">
                <div className="p-2 bg-brand-500/20 rounded-lg hidden md:block">
                  <FileText size={24} className="text-brand-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Seu Contrato de Comissão</h3>
                  <p className="text-sm text-slate-400">Regras de repasse para cada indicado que deposita na plataforma.</p>
                </div>
              </div>
              <div className="flex items-center gap-6 bg-surface-900/50 p-3 rounded-lg border border-surface-800">
                <div className="text-center">
                  <p className="text-xs text-brand-400/80 font-bold uppercase tracking-wider mb-1">CPA (Primeiro Depósito)</p>
                  <p className="text-xl font-bold text-white">R$ {Number(stats?.cpa_value || 0).toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="h-8 w-px bg-surface-700"></div>
                <div className="text-center">
                  <p className="text-xs text-brand-400/80 font-bold uppercase tracking-wider mb-1">RevShare (Todos os Depósitos)</p>
                  <p className="text-xl font-bold text-white">{Number(stats?.revshare_percentage || 0).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-6 border-surface-800 bg-surface-900/50 hover:bg-surface-900 transition-colors h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-slate-400 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users size={20} className="text-blue-400" />
                    </div>
                    <span className="font-medium uppercase tracking-wider text-xs">Indicações</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-white">{stats?.total_referrals || 0}</p>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-6 border-surface-800 bg-surface-900/50 hover:bg-surface-900 transition-colors h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-slate-400 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <UserPlus size={20} className="text-green-400" />
                    </div>
                    <span className="font-medium uppercase tracking-wider text-xs">Depositantes</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-display font-bold text-white">{stats?.depositing_referrals || 0}</p>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      ({stats?.total_referrals > 0 ? Math.round(((stats?.depositing_referrals || 0) / stats?.total_referrals) * 100) : 0}%)
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-6 border-surface-800 bg-surface-900/50 hover:bg-surface-900 transition-colors h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-slate-400 mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Activity size={20} className="text-purple-400" />
                    </div>
                    <span className="font-medium uppercase tracking-wider text-xs">Gasto da Rede</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.total_deposited || 0)}
                  </p>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="p-6 border-brand-500/20 bg-brand-500/5 relative overflow-hidden h-full flex flex-col justify-between">
                <div className="absolute -right-4 -bottom-4 text-brand-500/10 pointer-events-none">
                  <DollarSign size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-brand-400 mb-4">
                    <div className="p-2 bg-brand-500/20 rounded-lg">
                      <DollarSign size={20} className="text-brand-300" />
                    </div>
                    <span className="font-medium uppercase tracking-wider text-xs">Meus Ganhos</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.total_earnings || 0)}
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Referrals Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-brand-400" />
              Últimas Indicações
            </h2>

            {referrals && referrals.length > 0 ? (
              <Card className="overflow-hidden border-surface-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-900 border-b border-surface-800">
                        <th className="p-4 text-xs font-medium uppercase tracking-wider text-slate-400">Usuário</th>
                        <th className="p-4 text-xs font-medium uppercase tracking-wider text-slate-400">Data de Cadastro</th>
                        <th className="p-4 text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {referrals.map((user: any) => (
                        <tr key={user.user_id} className="hover:bg-surface-900/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 text-sm font-bold">
                                {user.full_name[0] !== '*' ? user.full_name[0] : 'U'}
                              </div>
                              <span className="text-sm font-medium text-white">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-400">
                            {formatDateTime(user.created_at)}
                          </td>
                          <td className="p-4">
                            {user.has_deposited ? (
                              <Badge variant="success" size="sm" className="gap-1">
                                <CheckCircle2 size={12} /> Depositou
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm" className="gap-1 bg-surface-700 text-slate-300">
                                <XCircle size={12} /> Sem Depósito
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <EmptyState 
                icon={<Users size={32} />}
                title="Nenhuma indicação ainda"
                description="Compartilhe seu link de indicação para começar a construir sua rede de afiliados."
              />
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
