import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Shield, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'

function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('status', 'banned')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

const roleConfig = {
  client: { label: 'Cliente', variant: 'default' as const },
  admin: { label: 'Admin', variant: 'brand' as const },
  operator: { label: 'Operador', variant: 'info' as const },
}

const statusConfig = {
  active: { label: 'Ativo', variant: 'success' as const },
  suspended: { label: 'Suspenso', variant: 'warning' as const },
  banned: { label: 'Banido / Excluído', variant: 'danger' as const },
}

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const { data: users, isLoading } = useUsers()
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string } | null>(null)

  const banUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'banned', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Cliente excluído/banido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setConfirmAction(null)
    },
    onError: () => toast.error('Erro ao excluir cliente'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Usuários</h1>
        <p className="text-slate-400 text-sm">{users?.length || 0} usuários cadastrados</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : users && users.length > 0 ? (
        <div className="space-y-2">
          {users.map((user) => {
            const role = roleConfig[user.role as keyof typeof roleConfig] || roleConfig.client
            const status = statusConfig[user.status as keyof typeof statusConfig] || statusConfig.active
            return (
              <Card key={user.id} className="hover:border-surface-500/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                    {(user.full_name || 'U').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{user.full_name}</p>
                      <Badge variant={role.variant} size="sm">{role.label}</Badge>
                      <Badge variant={status.variant} size="sm" dot>{status.label}</Badge>
                    </div>
                    <p className="text-slate-500 text-xs">{user.email}</p>
                    {user.phone && <p className="text-slate-600 text-xs">{user.phone}</p>}
                  </div>
                  <p className="text-slate-600 text-xs shrink-0 hidden sm:block">
                    {formatDateTime(user.created_at)}
                  </p>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Link to={`/admin/usuarios/${user.id}`}>
                      <Button variant="outline" size="sm" leftIcon={<Eye size={14} />}>
                        Detalhes
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setConfirmAction({ id: user.id, action: 'ban' })}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      disabled={user.role === 'admin'}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={28} />}
          title="Nenhum usuário"
          description="Os usuários aparecerão aqui conforme se cadastrarem."
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!confirmAction}
        title="Excluir / Banir Cliente"
        description="Tem certeza que deseja inativar/excluir este cliente? Ele não poderá mais acessar o sistema ou comprar bilhetes, mas seu histórico financeiro será preservado."
        confirmLabel="Sim, Excluir"
        onConfirm={() => confirmAction && banUser.mutate(confirmAction.id)}
        onClose={() => setConfirmAction(null)}
        isLoading={banUser.isPending}
        variant="danger"
      />
    </div>
  )
}
