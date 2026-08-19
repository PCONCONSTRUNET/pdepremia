import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Edit, Megaphone, Search, Trash2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import { ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import type { Campaign } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function useCampaigns() {
  return useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Campaign[]
    },
  })
}

export default function AdminSorteios() {
  const queryClient = useQueryClient()
  const { data: campaigns, isLoading } = useCampaigns()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Sorteio excluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Erro ao excluir sorteio'),
  })

  const filtered = campaigns?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'diario': return <Badge variant="warning">Diário</Badge>
      case 'semanal': return <Badge variant="brand">Semanal</Badge>
      case 'mensal': return <Badge variant="success">Mensal</Badge>
      default: return <Badge variant="secondary">Padrão</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="success">Ativo</Badge>
      case 'draft': return <Badge variant="secondary">Rascunho</Badge>
      case 'finished': return <Badge variant="warning">Finalizado</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-2">
            <Megaphone className="text-brand-400" /> Sorteios
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie os sorteios diários, semanais, mensais e padrões</p>
        </div>
        <Link to="/admin/sorteios/novo">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Novo Sorteio
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar sorteio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark pl-9 w-full md:w-96"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:border-surface-500/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info */}
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                      {campaign.name}
                      {getTypeBadge(campaign.type)}
                      {getStatusBadge(campaign.status)}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-sm text-slate-400 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-500" />
                        Fim: {format(new Date(campaign.end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-slate-400">
                        Valor: <span className="text-brand-400 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.ticket_price)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={`/admin/sorteios/${campaign.id}`}>
                      <Button variant="outline" size="sm" leftIcon={<Edit size={14} />}>
                        Editar
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConfirmDelete(campaign.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon={<Megaphone />} 
          title="Nenhum sorteio encontrado" 
          description={search ? 'Tente buscar com outro termo' : 'Crie seu primeiro sorteio para começar'} 
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir Sorteio"
        description="Tem certeza que deseja excluir este sorteio? Esta ação não pode ser desfeita e removerá todos os dados associados (bilhetes, prêmios)."
        confirmLabel="Sim, Excluir"
        onConfirm={() => confirmDelete && deleteCampaign.mutate(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        isLoading={deleteCampaign.isPending}
        variant="danger"
      />
    </div>
  )
}
