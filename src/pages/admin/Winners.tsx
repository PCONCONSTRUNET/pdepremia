import { useState } from 'react'
import { Trophy, Award, Search, Copy } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatDateTime, maskName, copyToClipboard } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'

function useAllWinners() {
  return useQuery({
    queryKey: ['admin', 'winners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, campaign:campaigns(name), prize:prizes(name), user:profiles(full_name, email), prize_claim:prize_claims(status)')
        .order('won_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

const sourceLabel: Record<string, string> = {
  instant: '⚡ Instantâneo',
  box: '📦 Box',
  wheel: '🎡 Roleta',
  draw: '🎯 Sorteio',
}

const printReceipt = (w: any) => {
  const html = `
    <html>
      <head>
        <title>Comprovante de Premiação</title>
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
            <h2 class="title">Comprovante de Premiação</h2>
          </div>
          
          <div class="row">
            <span class="label">ID do Sorteio / Hash:</span>
            <span class="value" style="font-family: monospace; font-size: 12px;">${w.id}</span>
          </div>
          <div class="row">
            <span class="label">Ganhador:</span>
            <span class="value">${w.user?.full_name || 'Usuário Desconhecido'}</span>
          </div>
          <div class="row">
            <span class="label">Email:</span>
            <span class="value">${w.user?.email || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Prêmio:</span>
            <span class="value" style="font-size: 16px; color: #eab308;">${w.prize?.name || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Campanha / Sorteio:</span>
            <span class="value">${w.campaign?.name || 'N/A'}</span>
          </div>
          <div class="row">
            <span class="label">Data da Premiação:</span>
            <span class="value">${format(new Date(w.won_at), "dd/MM/yyyy 'às' HH:mm")}</span>
          </div>

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

export default function AdminWinners() {
  const { data: winners, isLoading } = useAllWinners()
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingWinner, setViewingWinner] = useState<any | null>(null)

  const filteredWinners = winners?.filter(w => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const nameMatch = (w as any).user?.full_name?.toLowerCase().includes(term)
    const emailMatch = (w as any).user?.email?.toLowerCase().includes(term)
    const idMatch = w.id.toLowerCase().includes(term)
    const prizeMatch = (w as any).prize?.name?.toLowerCase().includes(term)
    
    return nameMatch || emailMatch || idMatch || prizeMatch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Ganhadores</h1>
          <p className="text-slate-400 text-sm">{winners?.length || 0} prêmios distribuídos</p>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome, email, prêmio ou ID do hash..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredWinners && filteredWinners.length > 0 ? (
        <div className="space-y-3">
          {filteredWinners.map((winner) => (
            <div 
              key={winner.id}
              className="cursor-pointer group transition-transform hover:-translate-y-0.5"
              onClick={() => setViewingWinner(winner)}
            >
              <Card>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <Award size={18} className="text-gold-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">{(winner as any).user?.full_name}</p>
                      <p className="text-slate-500 text-xs">{(winner as any).user?.email}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" size="sm">{sourceLabel[winner.source] || winner.source}</Badge>
                      {(winner as any).prize_claim && (
                        <Badge variant="info" size="sm">{(winner as any).prize_claim?.status}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-gold-400 font-medium text-sm">🎁 {(winner as any).prize?.name}</p>
                  {/* @ts-ignore */}
                  {(winner as any).campaign?.name && <p className="text-slate-500 text-xs">{(winner as any).campaign?.name}</p>}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    <p className="text-slate-500 text-xs">{formatDateTime(winner.won_at)}</p>
                    <span className="text-slate-700 text-xs hidden sm:inline">•</span>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono bg-surface-900 border border-surface-700 px-2 py-1 rounded">
                      ID: {winner.id}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(winner.id)
                          toast.success('Hash ID copiado!')
                        }}
                        className="hover:text-white transition-colors p-0.5"
                        title="Copiar ID"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Trophy size={28} />}
          title="Nenhum ganhador encontrado"
          description={searchTerm ? "Nenhum ganhador corresponde à sua busca." : "Os ganhadores aparecerão aqui conforme as premiações forem realizadas."}
        />
      )}

      {/* Modal de Detalhes do Ganhador */}
      {viewingWinner && (
        <Modal
          isOpen={!!viewingWinner}
          onClose={() => setViewingWinner(null)}
          title="Detalhes do Ganhador"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-surface-900 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">ID (Hash)</span>
                <span className="text-white font-mono text-xs">{viewingWinner.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Ganhador</span>
                <span className="text-white font-medium">{viewingWinner.user?.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Email</span>
                <span className="text-white font-medium">{viewingWinner.user?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Prêmio</span>
                <span className="text-gold-400 font-bold">{viewingWinner.prize?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Origem</span>
                <Badge variant="default" size="sm">{sourceLabel[viewingWinner.source] || viewingWinner.source}</Badge>
              </div>
              {viewingWinner.campaign?.name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Campanha</span>
                  <span className="text-white text-sm">{viewingWinner.campaign?.name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Data da Premiação</span>
                <span className="text-white text-sm">{formatDateTime(viewingWinner.won_at)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="w-full bg-surface-900 border-surface-700 hover:text-white"
                onClick={() => printReceipt(viewingWinner)}
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
