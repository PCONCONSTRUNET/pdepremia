import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Edit2, Eye, EyeOff, Gift, Search,
  Save, Trash2, ImageOff, Sparkles, Check, X as XIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, CardSkeleton } from '@/components/common/Loading'
import type { Box, Prize, Campaign } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type BoxWithCampaign = Box & {
  campaign: Pick<Campaign, 'id' | 'name' | 'slug'> | null
}

type BoxFormData = {
  name: string
  price: string         // string para input controlado, converte na hora de salvar
  description: string
  image_url: string
  is_active: boolean
}

const emptyForm: BoxFormData = {
  name: '',
  price: '',
  description: '',
  image_url: '',
  is_active: true,
}

// ─── Queries ─────────────────────────────────────────────────────────────────

function useBoxes() {
  return useQuery({
    queryKey: ['admin', 'boxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .order('price', { ascending: true })
      if (error) throw error
      return data as unknown as BoxWithCampaign[]
    },
  })
}

// ─── Box Form Modal ───────────────────────────────────────────────────────────

function BoxFormModal({
  box,
  isOpen,
  onClose,
}: {
  box: BoxWithCampaign | null
  isOpen: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(box)

  const [form, setForm] = useState<BoxFormData>(
    box
      ? {
          name: box.name,
          price: (box.price ?? 0).toString(),
          description: box.description ?? '',
          image_url: box.image_url ?? '',
          is_active: box.is_active,
        }
      : emptyForm
  )

  // Sync form when box prop changes
  useEffect(() => {
    if (box) {
      setForm({
        name: box.name,
        price: (box.price ?? 0).toString(),
        description: box.description ?? '',
        image_url: box.image_url ?? '',
        is_active: box.is_active,
      })
    } else {
      setForm(emptyForm)
    }
  }, [box])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nome é obrigatório')
      const priceNum = parseFloat(form.price)
      if (isNaN(priceNum) || priceNum < 0) throw new Error('Preço inválido')

      const payload = {
        name: form.name.trim(),
        price: priceNum,
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      }

      if (isEditing && box) {
        const { error } = await supabase.from('boxes').update(payload).eq('id', box.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('boxes').insert({ ...payload, campaign_id: null, quantity_per_order: 1 })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Box atualizada!' : 'Box criada!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'boxes'] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao salvar box'),
  })

  const set = (key: keyof BoxFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Box' : 'Nova Box'}
      description={isEditing ? `Editando: ${box?.name}` : 'Crie uma nova box de prêmios'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Name + Price (side by side) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Nome da Box <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-dark w-full"
              placeholder="Ex: Box Lendária"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Preço (R$) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-dark w-full"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="0,00"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Descrição</label>
          <textarea
            className="input-dark w-full resize-none"
            rows={3}
            placeholder="Descrição exibida para o usuário..."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>

        {/* Image URL + preview */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">URL da Imagem</label>
          <div className="flex gap-3">
            <input
              type="text"
              className="input-dark flex-1"
              placeholder="https://..."
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
            />
            <div className="w-12 h-12 rounded-lg bg-surface-700 border border-surface-600/50 flex items-center justify-center overflow-hidden shrink-0">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-full h-full object-contain p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <ImageOff size={18} className="text-slate-600" />
              )}
            </div>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-700/40 border border-surface-600/30">
          <div>
            <p className="text-sm font-medium text-white">Box Ativa</p>
            <p className="text-xs text-slate-400 mt-0.5">Box visível e disponível para compra</p>
          </div>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.is_active ? 'bg-brand-500' : 'bg-surface-600'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                form.is_active ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saveMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Save size={16} />}
            onClick={() => saveMutation.mutate()}
            isLoading={saveMutation.isPending}
            disabled={saveMutation.isPending}
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Box'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Box Prizes Modal ─────────────────────────────────────────────────────────

function BoxPrizesModal({
  box,
  isOpen,
  onClose,
}: {
  box: BoxWithCampaign | null
  isOpen: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPrize, setNewPrize] = useState({ name: '', quantity: 1, reference_value: '', drop_chance: '10', prize_type: 'box', double_spins_count: '', double_spins_value: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingDropChance, setEditingDropChance] = useState<string | null>(null) // prize id being edited
  const [editDropValue, setEditDropValue] = useState<string>('')

  const { data: prizes, isLoading } = useQuery({
    queryKey: ['admin', 'box-prizes', box?.id],
    enabled: isOpen && Boolean(box?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('box_id', box!.id)
        .eq('status', 'active')
        .in('prize_type', ['box', 'double_spins'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Prize[]
    },
  })

  const addPrizeMutation = useMutation({
    mutationFn: async () => {
      if (!newPrize.name.trim()) throw new Error('Nome do prêmio é obrigatório')
      const payload: any = {
        box_id: box!.id,
        name: newPrize.name.trim(),
        prize_type: newPrize.prize_type,
        quantity: 9999999,
        remaining: 9999999,
        reference_value: newPrize.reference_value ? Number(newPrize.reference_value) : null,
        drop_chance: newPrize.drop_chance ? Number(newPrize.drop_chance) : 10,
        status: 'active',
        is_public: true,
      }

      if (payload.name.toLowerCase().includes('tente novamente')) {
        payload.image_url = '/tente_novamente.png'
      }

      if (newPrize.prize_type === 'double_spins') {
        const count = newPrize.double_spins_count ? Number(newPrize.double_spins_count) : 0
        payload.double_spins_count = count
        payload.double_spins_value = newPrize.double_spins_value ? Number(newPrize.double_spins_value) : 0
        
        if (count === 2) payload.image_url = '/2 rodadas gratis.png'
        else if (count === 5) payload.image_url = '/5 rodadas gratis.png'
        else if (count === 10) payload.image_url = '/10 rodadas gratis.png'
        else if (count === 15) payload.image_url = '/15 rodadas gratis.png'
      }

      const { error } = await supabase.from('prizes').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Prêmio adicionado!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'box-prizes', box?.id] })
      setNewPrize({ name: '', quantity: 1, reference_value: '', drop_chance: '10', prize_type: 'box', double_spins_count: '', double_spins_value: '' })
      setShowAddForm(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao adicionar prêmio'),
  })

  const deletePrizeMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete to prevent foreign key constraint errors
      const { error } = await supabase.from('prizes').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Prêmio removido!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'box-prizes', box?.id] })
      setConfirmDelete(null)
    },
    onError: () => toast.error('Erro ao remover prêmio'),
  })

  const updateDropChanceMutation = useMutation({
    mutationFn: async ({ id, drop_chance }: { id: string; drop_chance: number }) => {
      const { error } = await supabase
        .from('prizes')
        .update({ drop_chance })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Probabilidade atualizada!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'box-prizes', box?.id] })
      setEditingDropChance(null)
    },
    onError: () => toast.error('Erro ao atualizar probabilidade'),
  })

  if (!box) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Prêmios — ${box.name}`}
        description={`Campanha: ${box.campaign?.name}`}
        size="xl"
      >
        <div className="space-y-4">
          {/* Add prize button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-surface-600/50 text-slate-400 hover:text-brand-400 hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-sm font-medium"
            >
              <Plus size={16} />
              Adicionar Prêmio
            </button>
          )}

          {/* Add prize form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl border border-brand-500/25 bg-brand-500/5 space-y-3">
                  <p className="text-sm font-medium text-brand-400 flex items-center gap-2">
                    <Sparkles size={14} /> Novo Prêmio
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Nome do Prêmio *</label>
                      <input
                        type="text"
                        className="input-dark w-full"
                        placeholder="Ex: iPhone 15 Pro"
                        value={newPrize.name}
                        onChange={(e) => setNewPrize((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Tipo de Prêmio</label>
                      <select 
                        className="input-dark w-full bg-[#1A1F24]"
                        value={newPrize.prize_type}
                        onChange={(e) => setNewPrize((p) => ({ ...p, prize_type: e.target.value }))}
                      >
                        <option value="box">Prêmio Físico/Dinheiro</option>
                        <option value="double_spins">Giros Grátis (Double)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Valor de Referência (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        className="input-dark w-full"
                        placeholder="0,00"
                        value={newPrize.reference_value}
                        onChange={(e) => setNewPrize((p) => ({ ...p, reference_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Chance de Drop (%)
                        <span className="ml-1 text-slate-500 text-[10px]">(ex: 50 = comum, 3 = raro)</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min={0.001}
                        max={100}
                        className="input-dark w-full"
                        placeholder="10"
                        value={newPrize.drop_chance}
                        onChange={(e) => setNewPrize((p) => ({ ...p, drop_chance: e.target.value }))}
                      />
                    </div>
                    {newPrize.prize_type === 'double_spins' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Qtd. Giros</label>
                          <input
                            type="number"
                            min={1}
                            className="input-dark w-full"
                            placeholder="5"
                            value={newPrize.double_spins_count}
                            onChange={(e) => setNewPrize((p) => ({ ...p, double_spins_count: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">R$ por Giro</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            className="input-dark w-full"
                            placeholder="2,00"
                            value={newPrize.double_spins_value}
                            onChange={(e) => setNewPrize((p) => ({ ...p, double_spins_value: e.target.value }))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowAddForm(false); setNewPrize({ name: '', quantity: 1, reference_value: '', drop_chance: '10', prize_type: 'box', double_spins_count: '', double_spins_value: '' }) }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={addPrizeMutation.isPending}
                      onClick={() => addPrizeMutation.mutate()}
                    >
                      Salvar Prêmio
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prizes list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-700/40 animate-pulse" />
              ))}
            </div>
          ) : prizes && prizes.length > 0 ? (
            <div className="space-y-2">
              {prizes.map((prize, i) => (
                <motion.div
                  key={prize.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-700/40 border border-surface-600/30 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Gift size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{prize.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {prize.reference_value && (
                        <span className="text-xs text-emerald-400 font-medium">
                          R$ {prize.reference_value.toFixed(2)}
                        </span>
                      )}
                      {(prize as any).drop_chance !== undefined && (
                        editingDropChance === prize.id ? (
                          <span className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min={0.1}
                              max={100}
                              autoFocus
                              value={editDropValue}
                              onChange={(e) => setEditDropValue(e.target.value)}
                              className="w-16 px-1 py-0.5 text-xs rounded bg-surface-700 border border-amber-500/50 text-amber-300 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateDropChanceMutation.mutate({ id: prize.id, drop_chance: Number(editDropValue) })
                                if (e.key === 'Escape') setEditingDropChance(null)
                              }}
                            />
                            <button
                              onClick={() => updateDropChanceMutation.mutate({ id: prize.id, drop_chance: Number(editDropValue) })}
                              className="p-0.5 rounded text-green-400 hover:bg-green-500/10"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingDropChance(null)}
                              className="p-0.5 rounded text-red-400 hover:bg-red-500/10"
                            >
                              <XIcon size={12} />
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { setEditingDropChance(prize.id); setEditDropValue(String((prize as any).drop_chance)) }}
                            className="text-xs text-amber-400 font-medium hover:text-amber-300 hover:underline transition-colors"
                            title="Clique para editar a probabilidade"
                          >
                            {(prize as any).drop_chance}% drop
                          </button>
                        )
                      )}
                      <Badge
                        variant={prize.status === 'active' ? 'success' : prize.status === 'exhausted' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {prize.status === 'active' ? 'Ativo' : prize.status === 'exhausted' ? 'Esgotado' : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(prize.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Gift size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm">Nenhum prêmio cadastrado para esta box</p>
              <p className="text-slate-500 text-xs mt-1">Adicione prêmios usando o botão acima</p>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deletePrizeMutation.mutate(confirmDelete)}
        title="Remover Prêmio"
        description="Tem certeza que deseja remover este prêmio? Esta ação não pode ser desfeita."
        confirmLabel="Sim, remover"
        isLoading={deletePrizeMutation.isPending}
      />
    </>
  )
}

// ─── Box Card ─────────────────────────────────────────────────────────────────

function BoxCard({
  box,
  onEdit,
  onManagePrizes,
  onToggleActive,
  onGenerateHash,
}: {
  box: BoxWithCampaign
  onEdit: (b: BoxWithCampaign) => void
  onManagePrizes: (b: BoxWithCampaign) => void
  onToggleActive: (b: BoxWithCampaign) => void
  onGenerateHash: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
      className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
        box.is_active
          ? 'bg-surface-800 border-surface-600/40 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5'
          : 'bg-surface-800/60 border-surface-700/30 opacity-60 hover:opacity-80'
      }`}
    >
      {/* Image / placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-surface-700 to-surface-800 overflow-hidden">
        {box.image_url ? (
          <img
            src={box.image_url}
            alt={box.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package size={48} className="text-surface-600" />
            <span className="text-xs text-slate-600">Sem imagem</span>
          </div>
        )}

        {/* Status overlay badge */}
        <div className="absolute top-3 left-3">
          <Badge variant={box.is_active ? 'success' : 'muted'} dot size="sm">
            {box.is_active ? 'Ativa' : 'Oculta'}
          </Badge>
        </div>

        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <span className="text-xs bg-emerald-500/20 backdrop-blur-sm text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
            R$ {(box.price ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-white text-base leading-tight">{box.name}</h3>
        {box.description && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{box.description}</p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onEdit(box)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-700/50 hover:bg-surface-600/60 border border-surface-600/30 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <Edit2 size={13} />
            Editar
          </button>
          <button
            onClick={() => onToggleActive(box)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              box.is_active
                ? 'bg-surface-700/50 hover:bg-amber-500/10 border-surface-600/30 hover:border-amber-500/30 text-slate-300 hover:text-amber-400'
                : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 text-emerald-400'
            }`}
          >
            {box.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
            {box.is_active ? 'Ocultar' : 'Ativar'}
          </button>
          <button
            onClick={() => onManagePrizes(box)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 hover:text-amber-300 text-xs font-medium transition-all"
          >
            <Gift size={13} />
            Prêmios
          </button>
        </div>

        {/* Audit Hash Action */}
        <div className="mt-2">
          {!(box as any).audit_hash ? (
            <button
              onClick={onGenerateHash}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface-700/50 hover:bg-brand-500/10 border border-surface-600/30 hover:border-brand-500/30 text-slate-400 hover:text-brand-400 text-xs font-medium transition-all"
            >
              Gerar Hash de Auditoria
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-success-500/10 border border-success-500/20 text-success-400 text-xs font-medium cursor-default">
              Hash Auditado
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBoxes() {
  const queryClient = useQueryClient()
  const { data: boxes, isLoading } = useBoxes()

  const [search, setSearch] = useState('')
  const [showHidden, setShowHidden] = useState(true)

  // Modals
  const [formBox, setFormBox] = useState<BoxWithCampaign | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [prizesBox, setPrizesBox] = useState<BoxWithCampaign | null>(null)
  const [prizesOpen, setPrizesOpen] = useState(false)
  const [confirmHashBox, setConfirmHashBox] = useState<BoxWithCampaign | null>(null)

  const toggleActiveMutation = useMutation({
    mutationFn: async (box: BoxWithCampaign) => {
      const { error } = await supabase
        .from('boxes')
        .update({ is_active: !box.is_active })
        .eq('id', box.id)
      if (error) throw error
    },
    onSuccess: (_, box) => {
      toast.success(box.is_active ? 'Box ocultada' : 'Box ativada')
      queryClient.invalidateQueries({ queryKey: ['admin', 'boxes'] })
    },
    onError: () => toast.error('Erro ao alterar status'),
  })

  const generateHashMutation = useMutation({
    mutationFn: async (box: BoxWithCampaign) => {
      const payload = `${box.id}:${box.name}:${Date.now()}:${Math.random()}`
      const msgBuffer = new TextEncoder().encode(payload)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      const { error } = await supabase
        .from('boxes')
        .update({
          audit_hash: hashHex,
          audit_hash_generated_at: new Date().toISOString()
        })
        .eq('id', box.id)
      
      if (error) throw error
      return hashHex
    },
    onSuccess: () => {
      toast.success('Hash de auditoria gerado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'boxes'] })
      setConfirmHashBox(null)
    },
    onError: () => toast.error('Erro ao gerar hash'),
  })

  const handleEdit = (box: BoxWithCampaign) => {
    setFormBox(box)
    setFormOpen(true)
  }

  const handleNewBox = () => {
    setFormBox(null)
    setFormOpen(true)
  }

  const handleManagePrizes = (box: BoxWithCampaign) => {
    setPrizesBox(box)
    setPrizesOpen(true)
  }

  const filtered = boxes?.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase())
    const matchHidden = showHidden || b.is_active
    return matchSearch && matchHidden
  })

  const activeCount = boxes?.filter((b) => b.is_active).length ?? 0
  const hiddenCount = boxes?.filter((b) => !b.is_active).length ?? 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-2.5">
            <Package className="text-amber-400" />
            Boxes
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Gerencie as boxes de prêmios da plataforma
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleNewBox}
        >
          Nova Box
        </Button>
      </div>

      {/* ── Stats chips ── */}
      {!isLoading && boxes && boxes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs bg-surface-700/50 border border-surface-600/30 text-slate-300 px-3 py-1.5 rounded-full">
            📦 {boxes.length} boxes no total
          </span>
          <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full">
            ✓ {activeCount} ativas
          </span>
          {hiddenCount > 0 && (
            <span className="text-xs bg-surface-700/50 border border-surface-600/30 text-slate-500 px-3 py-1.5 rounded-full">
              👁 {hiddenCount} ocultas
            </span>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar box..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 w-full"
          />
        </div>

        <button
          onClick={() => setShowHidden((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            showHidden
              ? 'bg-surface-700/50 border-surface-600/30 text-slate-300'
              : 'bg-surface-700/50 border-surface-600/30 text-slate-500'
          }`}
        >
          {showHidden ? <Eye size={15} /> : <EyeOff size={15} />}
          {showHidden ? 'Mostrando ocultas' : 'Ocultas escondidas'}
        </button>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-surface-800 border border-surface-700/40 animate-pulse" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((box) => (
            <BoxCard
              key={box.id}
              box={box}
              onEdit={handleEdit}
              onManagePrizes={handleManagePrizes}
              onToggleActive={(b) => toggleActiveMutation.mutate(b)}
              onGenerateHash={() => setConfirmHashBox(box)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Package />}
          title={search ? 'Nenhuma box encontrada' : 'Nenhuma box cadastrada'}
          description={
            search
              ? 'Tente outro termo de busca'
              : 'Crie sua primeira box de prêmios clicando em "Nova Box"'
          }
        />
      )}

      {/* ── Modals ── */}
      <BoxFormModal
        box={formBox}
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <BoxPrizesModal
        box={prizesBox}
        isOpen={prizesOpen}
        onClose={() => setPrizesOpen(false)}
      />

      {/* Confirm Hash Modal */}
      <ConfirmModal
        isOpen={!!confirmHashBox}
        title="Gerar Hash de Auditoria"
        description="Tem certeza? Isso irá gerar um hash criptográfico público (SHA-256) para esta box provando a integridade dela. Esta ação não pode ser desfeita."
        confirmLabel="Sim, gerar hash"
        onConfirm={() => confirmHashBox && generateHashMutation.mutate(confirmHashBox)}
        onClose={() => setConfirmHashBox(null)}
        isLoading={generateHashMutation.isPending}
        variant="brand"
      />
    </div>
  )
}
