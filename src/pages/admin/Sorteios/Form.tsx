import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Plus, Trash2, Trophy, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/Loading'
import { Badge } from '@/components/ui/Badge'
import type { Campaign, Prize, Ticket } from '@/types'
import { format } from 'date-fns'

export default function AdminSorteioForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Form State
  const [name, setName] = useState('')
  const [type, setType] = useState('padrao')
  const [ticketPrice, setTicketPrice] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('draft')
  const [isPublic, setIsPublic] = useState(true)
  
  // Prizes State
  const [prizesList, setPrizesList] = useState<{ id?: string, name: string }[]>([{ name: '' }])
  
  // Draw State
  const [confirmDraw, setConfirmDraw] = useState(false)

  // Queries
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['admin', 'campaign', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
      if (error) throw error
      
      setName(data.name)
      setType(data.type)
      setTicketPrice(data.ticket_price)
      setStartDate(data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '')
      setEndDate(data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '')
      setStatus(data.status)
      setIsPublic(data.is_public ?? true)
      return data as Campaign
    },
    enabled: isEditing
  })

  const { data: prizes } = useQuery({
    queryKey: ['admin', 'campaign-prizes', id],
    queryFn: async () => {
      if (!id) return []
      const { data, error } = await supabase.from('prizes').select('*').eq('campaign_id', id).order('created_at', { ascending: true })
      if (error) throw error
      return data as Prize[]
    },
    enabled: isEditing
  })

  useEffect(() => {
    if (prizes && prizes.length > 0) {
      setPrizesList(prizes.map(p => ({ id: p.id, name: p.name })))
    }
  }, [prizes])

  const { data: draws } = useQuery({
    queryKey: ['admin', 'campaign-draws', id],
    queryFn: async () => {
      if (!id) return []
      const { data, error } = await supabase.from('draws').select('*, winner_user_id').eq('campaign_id', id)
      if (error) throw error
      return data
    },
    enabled: isEditing
  })

  const { data: participants } = useQuery({
    queryKey: ['admin', 'campaign-participants', id],
    queryFn: async () => {
      if (!id) return []
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id, ticket_number, created_at,
          user:profiles!tickets_user_id_fkey(full_name, email)
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: isEditing
  })

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name || !startDate || !endDate) throw new Error('Preencha os campos obrigatórios')

      const payload = {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        ticket_price: Number(ticketPrice),
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        status,
        is_public: isPublic,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }

      let campaignId = id
      if (isEditing) {
        delete payload.created_by
        const { error } = await supabase.from('campaigns').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('campaigns').insert(payload).select('id').single()
        if (error) throw error
        campaignId = data.id
      }

      // Handle Prizes
      const validPrizes = prizesList.filter(p => p.name.trim() !== '')
      
      for (const p of validPrizes) {
        if (p.id) {
          await supabase.from('prizes').update({ name: p.name.trim() }).eq('id', p.id)
        } else {
          await supabase.from('prizes').insert({
            campaign_id: campaignId,
            name: p.name.trim(),
            prize_type: 'draw',
            quantity: 1,
            remaining: 1,
            status: 'active'
          })
        }
      }

      // Handle Deleted Prizes
      if (isEditing && prizes) {
        const currentPrizeIds = validPrizes.map(p => p.id).filter(Boolean)
        const prizesToDelete = prizes.filter(p => !currentPrizeIds.includes(p.id))
        if (prizesToDelete.length > 0) {
          await supabase.from('prizes').delete().in('id', prizesToDelete.map(p => p.id))
        }
      }

      return campaignId
    },
    onSuccess: (newId) => {
      toast.success(isEditing ? 'Sorteio atualizado!' : 'Sorteio criado!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] })
      if (!isEditing) navigate(`/admin/sorteios/${newId}`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar sorteio')
    }
  })

  const drawWinnerMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID não encontrado')
      if (!prizes || prizes.length === 0) throw new Error('O sorteio não tem prêmios configurados')
      
      const { data, error } = await supabase.rpc('draw_campaign_winner', { campaign_uuid: id })
      
      if (error) throw new Error(error.message)
      
      setStatus('finished')
      return data
    },
    onSuccess: () => {
      toast.success('Ganhador sorteado e notificado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaign-draws', id] })
      setConfirmDraw(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao sortear')
      setConfirmDraw(false)
    }
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/sorteios" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-white text-2xl">
              {isEditing ? 'Editar Sorteio' : 'Novo Sorteio'}
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing && status === 'active' && (!draws || draws.length === 0) && (
            <Button variant="warning" leftIcon={<Trophy size={16} />} onClick={() => setConfirmDraw(true)}>
              Sortear Ganhador
            </Button>
          )}
          <Button 
            variant="primary" 
            leftIcon={<Save size={16} />}
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
          >
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h2 className="text-white font-medium mb-4">Informações do Sorteio</h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome / Título</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark w-full" placeholder="Ex: Sorteio do iPhone" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input-dark w-full">
                <option value="padrao">Padrão</option>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Valor do Bilhete (R$)</label>
              <input type="number" step="0.01" value={ticketPrice} onChange={(e) => setTicketPrice(Number(e.target.value))} className="input-dark w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Data de Início</label>
              <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Data Fim</label>
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-dark w-full" />
            </div>
          </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-dark w-full">
                <option value="draft">Rascunho</option>
                <option value="active">Ativo</option>
                <option value="finished">Finalizado</option>
              </select>
            </div>
            <div className="flex items-center gap-3 bg-surface-900 border border-surface-700 rounded-xl p-4">
              <input 
                type="checkbox" 
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-surface-950"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-white cursor-pointer select-none flex-1">
                Sorteio Público
                <span className="block text-xs text-slate-400 font-normal">Exibir este sorteio na página de Sorteios para todos os clientes.</span>
              </label>
            </div>
          </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Prêmios</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPrizesList([...prizesList, { name: '' }])}
              >
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {prizesList.map((p, idx) => (
                <div key={p.id || idx} className="flex gap-2 items-center">
                  <span className="text-slate-400 font-bold w-6 text-sm">{idx + 1}º</span>
                  <input 
                    type="text" 
                    value={p.name} 
                    onChange={(e) => {
                      const copy = [...prizesList]
                      copy[idx].name = e.target.value
                      setPrizesList(copy)
                    }} 
                    className="input-dark flex-1" 
                    placeholder="Ex: 1x iPhone 15 Pro Max" 
                  />
                  <button 
                    onClick={() => {
                      const copy = [...prizesList]
                      copy.splice(idx, 1)
                      setPrizesList(copy)
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-surface-800 rounded-lg transition-colors"
                    title="Remover prêmio"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {prizesList.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum prêmio configurado.</p>
              )}
            </div>
          </Card>

          {isEditing && draws && draws.length > 0 && (
            <Card className="border-brand-500/30">
              <h2 className="text-white font-medium mb-4 flex items-center gap-2 text-brand-400">
                <Trophy size={18} /> Ganhadores
              </h2>
              <div className="space-y-3">
                {draws.map((d) => (
                  <div key={d.id} className="p-4 bg-brand-500/10 rounded-lg border border-brand-500/20">
                    <p className="text-white font-medium">Bilhete: {d.result_ticket_number}</p>
                    <p className="text-sm text-brand-300 mt-1">Sorteado em: {format(new Date(d.drawn_at || d.draw_date), 'dd/MM/yyyy HH:mm')}</p>
                    <Badge variant="success" className="mt-2">Notificação Enviada</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {isEditing && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-medium">Participantes</h2>
                <Badge variant="primary">{participants?.length || 0} Bilhetes</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {participants && participants.length > 0 ? (
                  participants.map((p: any) => (
                    <div key={p.id} className="flex flex-col p-3 bg-surface-900 rounded-lg border border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-medium">{p.user?.full_name || 'Desconhecido'}</span>
                        <span className="text-brand-400 font-bold bg-brand-500/10 px-2 rounded">#{p.ticket_number}</span>
                      </div>
                      <span className="text-xs text-slate-500">{p.user?.email}</span>
                      <span className="text-xs text-slate-500 mt-1">{format(new Date(p.created_at), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhum bilhete vendido ainda.</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDraw}
        title="Sortear Ganhador"
        description="Tem certeza que deseja sortear o ganhador? Isso vai escolher um bilhete aleatório, encerrar o sorteio e enviar uma notificação para o ganhador."
        confirmLabel="Sim, Sortear e Notificar"
        onConfirm={() => drawWinnerMutation.mutate()}
        onClose={() => setConfirmDraw(false)}
        isLoading={drawWinnerMutation.isPending}
        variant="brand"
      />
    </div>
  )
}
