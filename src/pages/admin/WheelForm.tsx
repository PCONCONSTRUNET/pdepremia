import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Plus, Trash2, Palette } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'
import { LoadingPage } from '@/components/common/Loading'
import type { Wheel, WheelItem, Campaign, Prize } from '@/types'

const PRESET_COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#F97316', '#6366F1'
]

export default function AdminWheelForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // --- States ---
  const [name, setName] = useState('Nova Roleta')
  const [campaignId, setCampaignId] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [isActive, setIsActive] = useState(true)
  
  // --- Mini Prize Creation Modal State ---
  const [creatingPrizeForIndex, setCreatingPrizeForIndex] = useState<number | null>(null)
  const [newPrizeName, setNewPrizeName] = useState('')
  const [newPrizeType, setNewPrizeType] = useState('instant')

  const createPrizeMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Selecione um sorteio primeiro')
      const { data, error } = await supabase
        .from('prizes')
        .insert({
          campaign_id: campaignId,
          name: newPrizeName,
          prize_type: newPrizeType,
          quantity: 1,
          remaining: 1
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (newPrize) => {
      toast.success('Prêmio criado!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'prizes', campaignId] })
      
      // Auto-assign to the slice
      if (creatingPrizeForIndex !== null) {
        handleItemChange(creatingPrizeForIndex, 'prize_id', newPrize.id)
      }
      
      setCreatingPrizeForIndex(null)
      setNewPrizeName('')
    },
    onError: () => toast.error('Erro ao criar prêmio')
  })

  const [items, setItems] = useState<Partial<WheelItem>[]>([
    { label: 'Prêmio 1', color: '#F59E0B', probability: 0.25, position: 1 },
    { label: 'Prêmio 2', color: '#10B981', probability: 0.25, position: 2 },
    { label: 'Prêmio 3', color: '#3B82F6', probability: 0.25, position: 3 },
    { label: 'Prêmio 4', color: '#8B5CF6', probability: 0.25, position: 4 },
  ])

  // --- Queries ---
  const { data: campaigns } = useQuery({
    queryKey: ['admin', 'campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('id, name').order('created_at', { ascending: false })
      if (error) throw error
      return data as Campaign[]
    }
  })

  const { data: prizes } = useQuery({
    queryKey: ['admin', 'prizes', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await supabase.from('prizes').select('*').eq('campaign_id', campaignId)
      if (error) throw error
      return data as Prize[]
    },
    enabled: !!campaignId
  })

  const { isLoading: isLoadingWheel } = useQuery({
    queryKey: ['admin', 'wheel', id],
    queryFn: async () => {
      if (!id) return null
      // Fetch wheel
      const { data: wheel, error: wheelError } = await supabase.from('wheels').select('*').eq('id', id).single()
      if (wheelError) throw wheelError

      // Fetch items
      const { data: wheelItems, error: itemsError } = await supabase.from('wheel_items').select('*').eq('wheel_id', id).order('position', { ascending: true })
      if (itemsError) throw itemsError

      setName(wheel.name)
      setCampaignId(wheel.campaign_id)
      setIsActive(wheel.is_active)
      if (wheelItems && wheelItems.length > 0) {
        setItems(wheelItems)
      }
      return wheel
    },
    enabled: isEditing
  })

  // --- Mutations ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error('Selecione um sorteio')
      if (items.length < 2) throw new Error('A roleta precisa de pelo menos 2 fatias')

      // Validate probabilities
      const totalProb = items.reduce((acc, curr) => acc + Number(curr.probability || 0), 0)
      if (Math.abs(totalProb - 1) > 0.01) {
        throw new Error(`A soma das probabilidades deve ser exatamente 1 (100%). Atual: ${(totalProb * 100).toFixed(1)}%`)
      }

      let currentWheelId = id

      if (isEditing) {
        // Update wheel
        const { error } = await supabase.from('wheels').update({ name, campaign_id: campaignId, is_active: isActive }).eq('id', currentWheelId)
        if (error) throw error
      } else {
        // Create wheel
        const { data, error } = await supabase.from('wheels').insert({ name, campaign_id: campaignId, is_active: isActive }).select('id').single()
        if (error) throw error
        currentWheelId = data.id
      }

      // Sync items (Delete all existing and insert new ones to keep it simple, or upsert)
      if (isEditing) {
        await supabase.from('wheel_items').delete().eq('wheel_id', currentWheelId)
      }

      const itemsToInsert = items.map((item, index) => ({
        wheel_id: currentWheelId,
        label: item.label || `Fatia ${index + 1}`,
        color: item.color || '#000000',
        probability: Number(item.probability || 0),
        position: index + 1,
        prize_id: item.prize_id || null
      }))

      const { error: itemsError } = await supabase.from('wheel_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      return currentWheelId
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Roleta atualizada!' : 'Roleta criada!')
      queryClient.invalidateQueries({ queryKey: ['admin', 'wheels'] })
      navigate('/admin/roletas')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar roleta')
    }
  })

  // --- Handlers ---
  const handleAddItem = () => {
    setItems([...items, { 
      label: `Novo Prêmio`, 
      color: PRESET_COLORS[items.length % PRESET_COLORS.length], 
      probability: 0, 
      position: items.length + 1 
    }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof WheelItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const autoBalanceProbabilities = () => {
    if (items.length === 0) return
    const eq = 1 / items.length
    setItems(items.map(i => ({ ...i, probability: Number(eq.toFixed(4)) })))
    toast.success('Probabilidades divididas igualmente!')
  }

  if (isLoadingWheel) return <LoadingPage />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/roletas" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-surface-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-display font-bold text-white text-2xl">
              {isEditing ? 'Editar Roleta' : 'Nova Roleta'}
            </h1>
          </div>
        </div>
        <Button 
          variant="primary" 
          leftIcon={<Save size={16} />}
          onClick={() => saveMutation.mutate()}
          isLoading={saveMutation.isPending}
        >
          Salvar Roleta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-white font-medium mb-4">Informações Básicas</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Nome da Roleta</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-dark w-full"
                placeholder="Ex: Roleta da Sorte"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Sorteio</label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="input-dark w-full"
              >
                <option value="">Selecione um sorteio...</option>
                {campaigns?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-brand-500' : 'bg-surface-700'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
                <span className="text-sm font-medium text-white">Roleta Ativa</span>
              </label>
            </div>
          </Card>
        </div>

        {/* Right Column: Wheel Items */}
        <div className="md:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-white font-medium">Fatias da Roleta</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Total probabilidade: {(items.reduce((a, b) => a + Number(b.probability || 0), 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={autoBalanceProbabilities}>
                  Equilibrar 
                </Button>
                <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} onClick={handleAddItem}>
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="p-4 rounded-xl bg-surface-950 border border-surface-700 flex flex-col gap-4 relative group">
                  <div className="flex items-start gap-4">
                    {/* Color picker */}
                    <div className="shrink-0">
                      <label className="block text-xs text-slate-400 mb-1">Cor</label>
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-surface-600">
                        <input
                          type="color"
                          value={item.color || '#000000'}
                          onChange={(e) => handleItemChange(index, 'color', e.target.value)}
                          className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Label */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Texto (Label)</label>
                        <input
                          type="text"
                          value={item.label || ''}
                          onChange={(e) => handleItemChange(index, 'label', e.target.value)}
                          className="input-dark w-full h-10"
                          placeholder="Ex: R$ 500"
                        />
                      </div>

                      {/* Probability */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Probabilidade (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={((item.probability || 0) * 100).toFixed(2)}
                            onChange={(e) => handleItemChange(index, 'probability', Number(e.target.value) / 100)}
                            className="input-dark w-full h-10 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="shrink-0 mt-6 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover fatia"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Prize Link */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
                      Vincular a um Prêmio Real (Opcional)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={item.prize_id || ''}
                        onChange={(e) => handleItemChange(index, 'prize_id', e.target.value || null)}
                        className="input-dark w-full h-10 text-sm"
                        disabled={!campaignId}
                      >
                        <option value="">Não vinculado (Apenas visual / Prêmio Falso)</option>
                        {prizes?.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.prize_type})</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!campaignId) {
                            toast.error('Selecione um sorteio primeiro!')
                            return
                          }
                          setCreatingPrizeForIndex(index)
                        }}
                        className="px-3 h-10 shrink-0 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Novo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center p-8 border border-dashed border-surface-700 rounded-xl text-slate-500">
                  Nenhuma fatia adicionada. Clique em "Adicionar" para começar.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Mini Modal for Quick Prize Creation */}
      <Modal
        isOpen={creatingPrizeForIndex !== null}
        onClose={() => setCreatingPrizeForIndex(null)}
        title="Criar Novo Prêmio"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome do Prêmio</label>
            <input
              type="text"
              value={newPrizeName}
              onChange={(e) => setNewPrizeName(e.target.value)}
              className="input-dark w-full h-10"
              placeholder="Ex: iPhone 15 Pro Max"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo do Prêmio</label>
            <select
              value={newPrizeType}
              onChange={(e) => setNewPrizeType(e.target.value)}
              className="input-dark w-full h-10"
            >
              <option value="instant">Prêmio Instantâneo</option>
              <option value="draw">Sorteio Final (Draw)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setCreatingPrizeForIndex(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => createPrizeMutation.mutate()}
              isLoading={createPrizeMutation.isPending}
              disabled={!newPrizeName.trim()}
            >
              Criar Prêmio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
