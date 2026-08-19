import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Mail, Phone, Calendar, ShoppingCart, Ticket, Trophy, DollarSign, Activity, Check, X, ShieldCheck, AlertCircle, RefreshCw, Wallet, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingPage, EmptyState } from '@/components/common/Loading'
import { UserAuditModal } from '@/components/admin/UserAuditModal'

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'tickets' | 'prizes'>('overview')
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [kycDocUrl, setKycDocUrl] = useState<string | null>(null)
  const [kycDocFrontUrl, setKycDocFrontUrl] = useState<string | null>(null)
  const [kycDocBackUrl, setKycDocBackUrl] = useState<string | null>(null)
  const [kycSelfieUrl, setKycSelfieUrl] = useState<string | null>(null)
  const [showKycVerificationModal, setShowKycVerificationModal] = useState(false)
  
  // Balance state
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [isAddingBalance, setIsAddingBalance] = useState(false)
  // KYC Rejection state
  const [showKycRejectModal, setShowKycRejectModal] = useState(false)
  const [kycRejectionReason, setKycRejectionReason] = useState('Identificação ilegível (foto embaçada/escura)')
  const [kycAllowResubmit, setKycAllowResubmit] = useState(true)
  const [kycRejecting, setKycRejecting] = useState(false)
  const rejectionReasons = [
    'Menor de idade',
    'CPF incorreto ou não pertence ao usuário',
    'Identificação ilegível (foto embaçada/escura)',
    'Documento inválido ou vencido',
    'Outro (suspeita de fraude)'
  ]

  // --- Fetch User Profile ---
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  useEffect(() => {
    const fetchSignedUrl = async (path: string | null | undefined, setter: (val: string | null) => void) => {
      if (!path) return
      const { data } = await supabase.storage.from('kyc_documents').createSignedUrl(path, 3600)
      if (data?.signedUrl) setter(data.signedUrl)
    }

    if (profile) {
      fetchSignedUrl(profile.kyc_document_url, setKycDocUrl)
      fetchSignedUrl(profile.kyc_doc_front_url, setKycDocFrontUrl)
      fetchSignedUrl(profile.kyc_doc_back_url, setKycDocBackUrl)
      fetchSignedUrl(profile.kyc_selfie_url, setKycSelfieUrl)
    }
  }, [profile])

  const handleKycAction = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      setShowKycRejectModal(true)
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: status })
        .eq('id', profile!.id)
      if (error) throw error
      toast.success('Usuário aprovado com sucesso!')
      window.location.reload()
    } catch (error: any) {
      toast.error('Erro ao atualizar: ' + error.message)
    }
  }

  const confirmKycRejection = async () => {
    setKycRejecting(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: kycAllowResubmit ? 'rejected' : 'rejected_locked',
          kyc_rejection_reason: kycRejectionReason
        })
        .eq('id', profile!.id)
      if (error) throw error
      toast.success('Documento rejeitado com sucesso!')
      window.location.reload()
    } catch (error: any) {
      toast.error('Erro ao rejeitar: ' + error.message)
    } finally {
      setKycRejecting(false)
    }
  }

  const handleUnlockKyc = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ kyc_status: 'rejected' })
        .eq('id', profile!.id)
      if (error) throw error
      toast.success('Reenvio liberado para o usuário!')
      window.location.reload()
    } catch (error: any) {
      toast.error('Erro ao liberar: ' + error.message)
    }
  }

  const handleAddBalance = async () => {
    const amount = Number(balanceAmount)
    if (amount <= 0) return

    setIsAddingBalance(true)
    try {
      const { error } = await supabase.rpc('admin_add_user_balance', {
        target_user_id: profile!.id,
        amount: amount
      })
      if (error) throw error
      toast.success('Saldo adicionado com sucesso!')
      setShowAddBalanceModal(false)
      setBalanceAmount('')
      window.location.reload()
    } catch (error: any) {
      toast.error('Erro ao adicionar saldo: ' + error.message)
    } finally {
      setIsAddingBalance(false)
    }
  }

  // --- Fetch Orders ---
  const { data: orders } = useQuery({
    queryKey: ['admin', 'user', id, 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, campaign:campaign_id(name)`)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  // --- Fetch Tickets ---
  const { data: tickets } = useQuery({
    queryKey: ['admin', 'user', id, 'tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`*, campaign:campaign_id(name)`)
        .eq('user_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  // --- Fetch Prizes ---
  const { data: prizes } = useQuery({
    queryKey: ['admin', 'user', id, 'prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select(`*, campaign:campaigns(name), prize:prizes(name, reference_value), box:boxes(name)`)
        .eq('user_id', id)
        .order('won_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id
  })

  if (isLoadingProfile) return <LoadingPage />
  if (!profile) return <EmptyState icon={<User />} title="Usuário não encontrado" description="O usuário pode ter sido excluído ou o link é inválido." />

  // Derived Stats
  const totalSpent = orders?.filter(o => o.status === 'paid').reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0
  const totalTickets = tickets?.length || 0
  const totalPrizes = prizes?.length || 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/usuarios" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-3">
            {profile.full_name}
            {profile.status === 'banned' && <Badge variant="danger">Banido</Badge>}
            {profile.kyc_status === 'approved' && <Badge variant="brand" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><ShieldCheck size={14} className="mr-1" /> Verificado</Badge>}
            {profile.kyc_status === 'pending_review' && <Badge variant="brand" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Em Análise</Badge>}
            {profile.kyc_status === 'rejected_locked' && <Badge variant="danger">KYC Bloqueado</Badge>}
            {profile.role === 'admin' && <Badge variant="brand">Admin</Badge>}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Detalhes e Histórico Completo</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="outline" 
            leftIcon={<RefreshCw size={18} />}
            onClick={() => {
              localStorage.removeItem('@premios:dailyWheelCooldown')
              toast.success('Tempo da Roleta resetado localmente para testes!')
            }}
            className="text-slate-300 border-surface-600 hover:bg-surface-700 hover:text-white"
            title="Reseta o cooldown da Roleta Diária no seu navegador"
          >
            Resetar Roleta
          </Button>
          <Button 
            variant="outline" 
            leftIcon={<Activity size={18} />}
            onClick={() => setShowAuditModal(true)}
            className="text-brand-400 border-brand-500/20 hover:bg-brand-500/10"
          >
            Auditoria
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Sidebar: Profile Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-4xl shadow-inner border border-brand-500/20">
                {(profile.full_name || 'U').slice(0, 1).toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail size={18} className="text-slate-500" />
                <span className="text-sm truncate">{profile.email}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone size={18} className="text-slate-500" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              {profile.cpf && (
                <div className="flex items-center gap-3 text-slate-300">
                  <User size={18} className="text-slate-500" />
                  <span className="text-sm">{profile.cpf}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-slate-300">
                <Calendar size={18} className="text-slate-500" />
                <span className="text-sm">Criado em {formatDateTime(profile.created_at)}</span>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center text-center p-4">
              <DollarSign size={24} className="text-green-400 mb-2" />
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total Gasto</p>
              <p className="text-lg text-white font-bold">{formatCurrency(totalSpent)}</p>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center p-4 relative group">
              <Wallet size={24} className="text-brand-400 mb-2" />
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Saldo Atual</p>
              <p className="text-lg text-white font-bold">{formatCurrency((profile as any).balance || 0)}</p>
              <button 
                onClick={() => setShowAddBalanceModal(true)}
                className="w-8 h-8 rounded-full bg-surface-800 border border-surface-600 text-brand-400 hover:bg-brand-500 hover:text-white flex items-center justify-center transition-all absolute top-2 right-2 opacity-0 group-hover:opacity-100 shadow-lg"
                title="Adicionar Saldo"
              >
                <Plus size={16} />
              </button>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center p-4">
              <Trophy size={24} className="text-yellow-400 mb-2" />
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Prêmios</p>
              <p className="text-lg text-white font-bold">{totalPrizes}</p>
            </Card>
          </div>

          {/* KYC Review Section */}
          {(profile.kyc_status === 'pending_review' || profile.kyc_status === 'approved' || profile.kyc_status === 'rejected_locked' || profile.kyc_status === 'none' || profile.kyc_status === 'requested') && (
            <Card className="space-y-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-400" />
                Verificação de Identidade
              </h3>
              
              {profile.kyc_status === 'none' && (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-slate-400">Usuário ainda não foi solicitado a enviar documentos.</p>
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-500/50 text-brand-400 hover:bg-brand-500/10" 
                    onClick={async () => {
                      try {
                        const { error } = await supabase.from('profiles').update({ kyc_status: 'requested' }).eq('id', profile.id)
                        if (error) throw error
                        toast.success('Documentação solicitada ao usuário!')
                        window.location.reload()
                      } catch (err: any) {
                        toast.error(err.message)
                      }
                    }}
                  >
                    Solicitar Documentação (KYC)
                  </Button>
                </div>
              )}

              {profile.kyc_status === 'requested' && (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-yellow-500">Aguardando o usuário enviar os documentos.</p>
                </div>
              )}

              {(kycDocUrl || kycDocFrontUrl || kycDocBackUrl || kycSelfieUrl) ? (
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full border-brand-500/50 text-brand-400 hover:bg-brand-500/10" 
                    onClick={() => setShowKycVerificationModal(true)}
                  >
                    {profile.kyc_status === 'pending_review' ? 'Iniciar Verificação' : 'Ver Documentos Analisados'}
                  </Button>

                  {profile.kyc_status === 'rejected_locked' && (
                    <Button 
                      variant="outline" 
                      className="w-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 mt-2" 
                      onClick={handleUnlockKyc}
                    >
                      Liberar Novo Envio ao Usuário
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm text-slate-400">Nenhum documento encontrado.</div>
              )}
            </Card>
          )}

        </div>

        {/* Right Content: Tabs */}
        <div className="md:col-span-2">
          <Card className="p-0 overflow-hidden h-full">
            <div className="flex border-b border-surface-700 overflow-x-auto">
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'orders' ? 'border-brand-500 text-brand-400 bg-brand-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-surface-800'}`}
              >
                <ShoppingCart size={16} /> Pedidos ({orders?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-brand-500 text-brand-400 bg-brand-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-surface-800'}`}
              >
                <Ticket size={16} /> Bilhetes ({totalTickets})
              </button>
              <button
                onClick={() => setActiveTab('prizes')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'prizes' ? 'border-brand-500 text-brand-400 bg-brand-500/5' : 'border-transparent text-slate-400 hover:text-white hover:bg-surface-800'}`}
              >
                <Trophy size={16} /> Prêmios ({totalPrizes})
              </button>
            </div>

            <div className="p-4">
              {/* ORDERS TAB */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {orders && orders.length > 0 ? (
                    orders.map(order => (
                      <div key={order.id} className="p-3 bg-surface-900 border border-surface-700 rounded-lg flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white text-sm font-medium">Pedido #{order.id.slice(0,8)}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{order.campaign?.name} • {order.quantity} bilhetes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-bold">{formatCurrency(order.total_amount)}</p>
                          <Badge size="sm" variant={order.status === 'paid' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'} className="mt-1">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={<ShoppingCart />} title="Nenhum pedido" description="Este cliente ainda não fez compras." />
                  )}
                </div>
              )}

              {/* TICKETS TAB */}
              {activeTab === 'tickets' && (
                <div className="space-y-3">
                  {tickets && tickets.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {tickets.map(ticket => (
                        <div key={ticket.id} className="p-2 bg-surface-900 border border-surface-700 rounded-lg text-center">
                          <p className="text-brand-400 font-mono font-bold text-lg">{ticket.ticket_number}</p>
                          <p className="text-slate-500 text-[10px] truncate">{ticket.campaign?.name}</p>
                          <Badge size="sm" variant={ticket.status === 'prize_won' ? 'success' : 'default'} className="mt-1 w-full text-[10px] py-0">
                            {ticket.status === 'prize_won' ? 'Premiado' : 'Comum'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<Ticket />} title="Nenhum bilhete" description="Este cliente ainda não possui bilhetes." />
                  )}
                </div>
              )}

              {/* PRIZES TAB */}
              {activeTab === 'prizes' && (
                <div className="space-y-3">
                  {prizes && prizes.length > 0 ? (
                    prizes.map(prize => (
                      <div key={prize.id} className="p-3 bg-surface-900 border border-yellow-500/20 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center shrink-0">
                          <Trophy size={20} className="text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{prize.prize?.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {prize.source === 'box' 
                              ? `Box: ${(prize as any).box?.name || 'Box da Sorte'}` 
                              : prize.campaign?.name ? `Sorteio: ${prize.campaign?.name}` : 'Origem Desconhecida'}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">{formatDateTime(prize.won_at)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState icon={<Trophy />} title="Nenhum prêmio" description="Este cliente ainda não ganhou prêmios." />
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <UserAuditModal 
        isOpen={showAuditModal} 
        onClose={() => setShowAuditModal(false)} 
        userId={profile.id} 
        userName={profile.full_name || 'Usuário'} 
      />
      {/* KYC Rejection Modal */}
      {showKycRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl w-full max-w-md border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="text-red-500" />
                Recusar Documento
              </h3>
              <button 
                onClick={() => setShowKycRejectModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Selecione o motivo da recusa. O usuário será notificado e deverá reenviar o documento de acordo com a correção necessária.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Motivo da Recusa</label>
                <select
                  value={kycRejectionReason}
                  onChange={(e) => {
                    setKycRejectionReason(e.target.value)
                    if (e.target.value.includes('Menor') || e.target.value.includes('fraude') || e.target.value.includes('não pertence')) {
                      setKycAllowResubmit(false)
                    } else {
                      setKycAllowResubmit(true)
                    }
                  }}
                  className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors"
                >
                  {rejectionReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kycAllowResubmit}
                    onChange={(e) => setKycAllowResubmit(e.target.checked)}
                    className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-800 bg-surface-900"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Permitir novo envio</span>
                    <span className="text-xs text-slate-400">Se desmarcado, o KYC do usuário ficará permanentemente bloqueado.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-surface-900/50">
              <Button variant="outline" onClick={() => setShowKycRejectModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                className="bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={confirmKycRejection}
                isLoading={kycRejecting}
              >
                Confirmar Recusa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Advanced Verification Modal */}
      {showKycVerificationModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-900/50">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="text-brand-400" />
                  Análise KYC: {profile.full_name}
                </h3>
                <p className="text-sm text-slate-400 mt-1">CPF: {profile.cpf} | Nasc: {profile.birth_date ? new Date(profile.birth_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
              </div>
              <button 
                onClick={() => setShowKycVerificationModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
              {(kycDocFrontUrl || kycDocBackUrl || kycSelfieUrl) ? (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center justify-between">
                      Frente do Documento
                      <a href={kycDocFrontUrl!} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">Ampliar</a>
                    </h4>
                    <div className="bg-surface-900 rounded-lg border border-surface-700 overflow-hidden h-64 flex items-center justify-center">
                      {kycDocFrontUrl ? <img src={kycDocFrontUrl} alt="Frente" className="max-w-full max-h-full object-contain" /> : <span className="text-slate-500">Não enviado</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center justify-between">
                      Verso do Documento
                      <a href={kycDocBackUrl!} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">Ampliar</a>
                    </h4>
                    <div className="bg-surface-900 rounded-lg border border-surface-700 overflow-hidden h-64 flex items-center justify-center">
                      {kycDocBackUrl ? <img src={kycDocBackUrl} alt="Verso" className="max-w-full max-h-full object-contain" /> : <span className="text-slate-500">Não enviado</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-300 flex items-center justify-between">
                      Selfie (Rosto)
                      <a href={kycSelfieUrl!} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">Ampliar</a>
                    </h4>
                    <div className="bg-surface-900 rounded-lg border border-surface-700 overflow-hidden h-64 flex items-center justify-center">
                      {kycSelfieUrl ? <img src={kycSelfieUrl} alt="Selfie" className="max-w-full max-h-full object-contain" /> : <span className="text-slate-500">Não enviado</span>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 space-y-2">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    Documento Antigo (Legado)
                    <a href={kycDocUrl!} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">Ampliar</a>
                  </h4>
                  <div className="bg-surface-900 rounded-lg border border-surface-700 overflow-hidden flex items-center justify-center p-4">
                    <img src={kycDocUrl!} alt="Documento Único" className="max-w-full max-h-96 object-contain" />
                  </div>
                </div>
              )}
            </div>

            {profile.kyc_status === 'pending_review' && (
              <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-surface-900/50">
                <Button onClick={() => handleKycAction('rejected')} variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                  Recusar
                </Button>
                <Button onClick={() => handleKycAction('approved')} variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  Aprovar Documentação
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Balance Modal */}
      {showAddBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl w-full max-w-md border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-900/50">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-brand-400" />
                Adicionar Saldo
              </h3>
              <button 
                onClick={() => setShowAddBalanceModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300">
                Adicione saldo diretamente à carteira deste usuário. Esta ação ficará registrada nos logs do sistema.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Valor a Adicionar (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-white focus:border-brand-500 focus:outline-none transition-colors"
                  placeholder="Ex: 50.00"
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-surface-900/50">
              <Button variant="outline" onClick={() => setShowAddBalanceModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAddBalance}
                isLoading={isAddingBalance}
                disabled={!balanceAmount || Number(balanceAmount) <= 0}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
