import { useEffect, useState } from 'react'
import { Wallet, Search, CheckCircle2, XCircle, Clock, SearchX } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'
import { formatCurrency, maskCPF, generateWithdrawalId } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

type Withdrawal = {
  id: string
  user_id: string
  amount: number
  pix_key: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  profiles: {
    full_name: string
    cpf: string | null
    pix_key_type: string | null
  } | null
}

const printReceipt = (w: Withdrawal) => {
  const html = `
    <html>
      <head>
        <title>Comprovante de Saque</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; background: white; margin: 0; }
          .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 8px; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-width: 150px; margin-bottom: 10px; background: #111; padding: 10px; border-radius: 8px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; color: #0f172a; }
          .row { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
          .label { color: #64748b; font-weight: 500; }
          .value { color: #0f172a; font-weight: 600; text-align: right; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .status-pending { background: #fef08a; color: #854d0e; }
          .status-approved { background: #bbf7d0; color: #166534; }
          .status-rejected { background: #fecaca; color: #991b1b; }
          @media print {
            body { padding: 0; }
            .receipt-container { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <img src="${window.location.origin}/logo-rodape.png" class="logo" alt="P DE PREMIA" />
            <h2 class="title">Comprovante de Saque</h2>
          </div>
          
          <div class="row">
            <span class="label">Cliente:</span>
            <span class="value">${w.profiles?.full_name}</span>
          </div>
          <div class="row">
            <span class="label">CPF do Cliente:</span>
            <span class="value">${w.profiles?.cpf || 'Não informado'}</span>
          </div>
          <div class="row">
            <span class="label">Chave PIX:</span>
            <span class="value">${w.pix_key} <br/><span style="font-size:11px; color:#64748b; font-weight:normal;">(${w.profiles?.pix_key_type?.toUpperCase() || 'PIX'})</span></span>
          </div>
          <div class="row">
            <span class="label">Valor Solicitado:</span>
            <span class="value" style="font-size: 16px;">R$ ${w.amount.toFixed(2).replace('.', ',')}</span>
          </div>
          <div class="row">
            <span class="label">Data da Solicitação:</span>
            <span class="value">${format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
          </div>
          <div class="row">
            <span class="label">ID da Transação:</span>
            <span class="value" style="font-family: monospace; font-size: 15px;">${generateWithdrawalId(w.id, w.profiles?.cpf, w.profiles?.full_name)}</span>
          </div>
          <div class="row">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status-badge status-${w.status}">
                ${w.status === 'pending' ? 'Pendente' : w.status === 'approved' ? 'Aprovado' : 'Recusado'}
              </span>
            </span>
          </div>
          ${w.admin_notes ? `
          <div class="row" style="flex-direction: column; border-bottom: none;">
            <span class="label" style="margin-bottom: 5px;">Observação Interna / Motivo:</span>
            <span class="value" style="text-align: left; font-weight: normal; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">${w.admin_notes}</span>
          </div>
          ` : ''}

          <div class="footer">
            Gerado pelo sistema <b>P DE PREMIA</b> em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </div>
        </div>
      </body>
    </html>
  `;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  } else {
    alert('Por favor, permita popups para gerar o comprovante.');
  }
};

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Actions
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null)
  const [viewingWithdrawal, setViewingWithdrawal] = useState<Withdrawal | null>(null)
  
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          profiles:user_id (
            full_name,
            cpf,
            pix_key_type
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setWithdrawals((data as any) || [])
    } catch (err: any) {
      toast.error('Erro ao buscar saques: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const { error } = await supabase.rpc('approve_withdrawal', { p_withdrawal_id: id })
      if (error) throw error
      toast.success('Saque aprovado com sucesso!')
      fetchWithdrawals()
    } catch (err: any) {
      toast.error('Erro ao aprovar saque: ' + err.message)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    if (!rejectReason.trim()) {
      toast.error('Por favor, informe o motivo da recusa.')
      return
    }

    try {
      const { error } = await supabase.rpc('reject_withdrawal', {
        p_withdrawal_id: rejectingId,
        p_reason: rejectReason
      })
      if (error) throw error
      
      toast.success('Saque recusado e saldo devolvido ao usuário.')
      setRejectingId(null)
      setRejectReason('')
      fetchWithdrawals()
    } catch (err: any) {
      toast.error('Erro ao recusar saque: ' + err.message)
    }
  }

  const filteredWithdrawals = withdrawals.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const termDigits = term.replace(/\D/g, '')
      
      const nameMatch = w.profiles?.full_name?.toLowerCase().includes(term)
      
      const wCpf = w.profiles?.cpf || ''
      const cpfDigits = wCpf.replace(/\D/g, '')
      const cpfMatch = wCpf.toLowerCase().includes(term) || (termDigits.length > 0 && cpfDigits.includes(termDigits))
      
      const pixMatch = w.pix_key.toLowerCase().includes(term)
      
      const idStr = generateWithdrawalId(w.id, w.profiles?.cpf, w.profiles?.full_name).toLowerCase()
      const idMatch = idStr.includes(term)
      
      return nameMatch || cpfMatch || pixMatch || idMatch
    }
    
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md text-xs font-medium"><CheckCircle2 size={14} /> Aprovado</span>
      case 'pending':
        return <span className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md text-xs font-medium"><Clock size={14} /> Pendente</span>
      case 'rejected':
        return <span className="flex items-center gap-1.5 text-red-400 bg-red-400/10 px-2.5 py-1 rounded-md text-xs font-medium"><XCircle size={14} /> Recusado</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Wallet className="text-brand-400" />
            Solicitações de Saque
          </h1>
          <p className="text-slate-400 mt-1">Gerencie os pedidos de saque dos usuários.</p>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou chave PIX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {(['pending', 'all', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'bg-surface-900 text-slate-400 hover:text-white hover:bg-surface-800'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'approved' ? 'Aprovados' : 'Recusados'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Solicitação</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Chave PIX</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="inline-block w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 mt-2">Carregando saques...</p>
                  </td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center mx-auto mb-4">
                      <SearchX className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-white font-medium mb-1">Nenhum saque encontrado</h3>
                    <p className="text-slate-400 text-sm">Não há saques que correspondam aos filtros atuais.</p>
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((w) => (
                  <tr 
                    key={w.id} 
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setViewingWithdrawal(w)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{w.profiles?.full_name}</span>
                        <span className="text-slate-500 text-xs">CPF: {w.profiles?.cpf ? maskCPF(w.profiles.cpf) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-mono text-sm">{generateWithdrawalId(w.id, w.profiles?.cpf, w.profiles?.full_name)}</span>
                        <span className="text-slate-500 text-xs">{format(new Date(w.created_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-mono text-sm">{w.pix_key}</span>
                        <span className="text-slate-500 text-xs uppercase tracking-wider">{w.profiles?.pix_key_type || 'PIX'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-brand-400 font-bold">{formatCurrency(w.amount)}</span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(w.status)}
                      {w.status === 'rejected' && w.admin_notes && (
                        <p className="text-xs text-red-400/80 mt-1 truncate max-w-[150px]" title={w.admin_notes}>
                          {w.admin_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {w.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmApproveId(w.id)
                            }}
                            isLoading={approvingId === w.id}
                          >
                            <CheckCircle2 size={16} className="mr-1.5" />
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRejectingId(w.id)
                            }}
                            disabled={approvingId === w.id}
                          >
                            <XCircle size={16} className="mr-1.5" />
                            Recusar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Aprovar Saque Modal */}
      <ConfirmModal
        isOpen={!!confirmApproveId}
        onClose={() => setConfirmApproveId(null)}
        onConfirm={() => {
          if (confirmApproveId) handleApprove(confirmApproveId)
          setConfirmApproveId(null)
        }}
        title="Aprovar Saque"
        description="Você já realizou a transferência PIX na sua conta bancária? Se sim, confirme para aprovar o saque no sistema."
        confirmLabel="Confirmar Aprovação"
        cancelLabel="Cancelar"
        variant="primary"
      />

      {/* Recusar Saque Modal */}
      <ConfirmModal
        isOpen={!!rejectingId}
        onClose={() => {
          setRejectingId(null)
          setRejectReason('')
        }}
        onConfirm={handleReject}
        title="Recusar Saque"
        description="Você está prestes a recusar este saque. O valor será estornado imediatamente para o saldo do usuário. Informe o motivo abaixo (ele será visível para o cliente)."
        confirmLabel="Recusar Saque"
        cancelLabel="Cancelar"
        variant="danger"
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Motivo da Recusa <span className="text-red-400">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full bg-surface-900 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors resize-none h-24"
            placeholder="Ex: Chave PIX inválida, inconsistência de dados, etc."
            required
          />
        </div>
      </ConfirmModal>

      {/* Modal de Detalhes do Saque e Comprovante */}
      {viewingWithdrawal && (
        <Modal
          isOpen={!!viewingWithdrawal}
          onClose={() => setViewingWithdrawal(null)}
          title="Detalhes do Saque"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-surface-900 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">ID da Transação</span>
                <span className="text-white font-mono text-sm">{generateWithdrawalId(viewingWithdrawal.id, viewingWithdrawal.profiles?.cpf, viewingWithdrawal.profiles?.full_name)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Cliente</span>
                <span className="text-white font-medium">{viewingWithdrawal.profiles?.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">CPF</span>
                <span className="text-white font-medium">{viewingWithdrawal.profiles?.cpf ? maskCPF(viewingWithdrawal.profiles.cpf) : 'Não informado'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Chave PIX ({viewingWithdrawal.profiles?.pix_key_type?.toUpperCase() || 'PIX'})</span>
                <span className="text-white font-mono text-sm">{viewingWithdrawal.pix_key}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Valor Solicitado</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(viewingWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Data</span>
                <span className="text-white text-sm">{format(new Date(viewingWithdrawal.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Status</span>
                <span>{getStatusBadge(viewingWithdrawal.status)}</span>
              </div>
              {viewingWithdrawal.admin_notes && (
                <div className="pt-3 border-t border-white/5">
                  <span className="block text-slate-400 text-sm mb-1">Observação Interna/Motivo</span>
                  <p className="text-white text-sm bg-surface-950 p-2 rounded-lg">{viewingWithdrawal.admin_notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="w-full bg-surface-900 border-surface-700 hover:text-white"
                onClick={() => printReceipt(viewingWithdrawal)}
              >
                Gerar Comprovante
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
