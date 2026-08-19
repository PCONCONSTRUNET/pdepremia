import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Edit, Disc3, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import { ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import type { Wheel, Campaign } from '@/types'

// Tipo mesclado para a listagem
type WheelWithCampaign = Wheel & {
  campaign: Pick<Campaign, 'name' | 'slug'>
}

function useWheels() {
  return useQuery({
    queryKey: ['admin', 'wheels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wheels')
        .select(`
          *,
          campaign:campaign_id (name, slug)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as WheelWithCampaign[]
    },
  })
}

export default function AdminWheels() {
  const queryClient = useQueryClient()
  const { data: wheels, isLoading } = useWheels()
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmHashWheel, setConfirmHashWheel] = useState<WheelWithCampaign | null>(null)

  const deleteWheel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wheels').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Roleta excluída com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wheels'] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Erro ao excluir roleta'),
  })

  const generateHashMutation = useMutation({
    mutationFn: async (wheel: WheelWithCampaign) => {
      const payload = `${wheel.id}:${wheel.name}:${Date.now()}:${Math.random()}`
      const msgBuffer = new TextEncoder().encode(payload)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const { error } = await supabase
        .from('wheels')
        .update({
          audit_hash: hashHex,
          audit_hash_generated_at: new Date().toISOString()
        })
        .eq('id', wheel.id)
      
      if (error) throw error
      return hashHex
    },
    onSuccess: () => {
      toast.success('Hash de auditoria gerado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wheels'] })
      setConfirmHashWheel(null)
    },
    onError: () => toast.error('Erro ao gerar hash'),
  })

  const filtered = wheels?.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.campaign?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-2">
            <Disc3 className="text-brand-400" /> Roletas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie roletas e seus prêmios visuais</p>
        </div>
        <Link to="/admin/roletas/nova">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Nova Roleta
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar roleta..."
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
          {filtered.map((wheel, i) => (
            <motion.div
              key={wheel.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:border-surface-500/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info */}
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                      {wheel.name}
                      {!wheel.is_active && (
                        <Badge variant="error" size="sm">Inativa</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Sorteio: <span className="text-slate-300">{wheel.campaign?.name}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!(wheel as any).audit_hash ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmHashWheel(wheel)}
                        className="text-slate-400 hover:text-brand-400 hover:bg-brand-500/10"
                        isLoading={generateHashMutation.isPending}
                      >
                        Gerar Hash
                      </Button>
                    ) : (
                      <Badge variant="success" size="sm">Hash Auditado</Badge>
                    )}
                    
                    <Link to={`/admin/roletas/${wheel.id}`}>
                      <Button variant="outline" size="sm" leftIcon={<Edit size={14} />}>
                        Editar
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConfirmDelete(wheel.id)}
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
          icon={<Disc3 />} 
          title="Nenhuma roleta encontrada" 
          description={search ? 'Tente buscar com outro termo' : 'Crie sua primeira roleta para oferecer prêmios extras'} 
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir Roleta"
        description="Tem certeza que deseja excluir esta roleta? Os giros já realizados pelos usuários não serão afetados, mas a roleta não poderá mais ser usada."
        confirmLabel="Sim, Excluir"
        onConfirm={() => confirmDelete && deleteWheel.mutate(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        isLoading={deleteWheel.isPending}
        variant="danger"
      />

      {/* Confirm Hash Modal */}
      <ConfirmModal
        isOpen={!!confirmHashWheel}
        title="Gerar Hash de Auditoria"
        description="Tem certeza? Isso irá gerar um hash criptográfico público (SHA-256) para esta roleta provando a integridade dela. Esta ação não pode ser desfeita."
        confirmLabel="Sim, gerar hash"
        onConfirm={() => confirmHashWheel && generateHashMutation.mutate(confirmHashWheel)}
        onClose={() => setConfirmHashWheel(null)}
        isLoading={generateHashMutation.isPending}
        variant="brand"
      />
    </div>
  )
}
