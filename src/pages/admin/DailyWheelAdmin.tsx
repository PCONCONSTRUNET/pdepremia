import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trophy, Plus, Save, Trash2, Edit2, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingPage } from '@/components/common/Loading'

type PrizeType = 'balance' | 'empty' | 'physical'

export interface DailyWheelPrize {
  id: string
  name: string
  category: string
  type: PrizeType
  value: number
  probability: number
  color: string
  imageUrl?: string
}

export type DailyWheelConfig = {
  'P Starter': DailyWheelPrize[]
  'P Hunter': DailyWheelPrize[]
  'P Master': DailyWheelPrize[]
  'P Legend': DailyWheelPrize[]
}

const DEFAULT_CONFIG: DailyWheelConfig = {
  'P Starter': [],
  'P Hunter': [],
  'P Master': [],
  'P Legend': []
}

const RANKS = ['P Starter', 'P Hunter', 'P Master', 'P Legend'] as const

export default function DailyWheelAdmin() {
  const queryClient = useQueryClient()
  const [activeRank, setActiveRank] = useState<keyof DailyWheelConfig>('P Starter')
  const [localConfig, setLocalConfig] = useState<DailyWheelConfig>(DEFAULT_CONFIG)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  
  // Form State
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formType, setFormType] = useState<PrizeType>('balance')
  const [formValue, setFormValue] = useState(0)
  const [formProb, setFormProb] = useState(10)
  const [formColor, setFormColor] = useState('#10B981')
  const [formImageUrl, setFormImageUrl] = useState('')

  const { data: configRecord, isLoading } = useQuery({
    queryKey: ['admin', 'system_settings', 'daily_wheel_prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'daily_wheel_prizes')
        .maybeSingle()
      
      if (error) throw error
      return data
    }
  })

  useEffect(() => {
    if (configRecord && configRecord.value) {
      setLocalConfig({ ...DEFAULT_CONFIG, ...(configRecord.value as any) })
    }
  }, [configRecord])

  const saveMutation = useMutation({
    mutationFn: async (newConfig: DailyWheelConfig) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'daily_wheel_prizes', value: newConfig as any }, { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system_settings', 'daily_wheel_prizes'] })
      toast.success('Configuração salva com sucesso!')
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar: ' + err.message)
    }
  })

  const handleSavePrize = () => {
    if (!formName) return toast.error('O nome do prêmio é obrigatório')
    
    const newPrize: DailyWheelPrize = {
      id: editingPrizeId || uuidv4(),
      name: formName,
      category: formCategory || 'Geral',
      type: formType,
      value: formType === 'balance' ? Number(formValue) : 0,
      probability: Number(formProb),
      color: formColor,
      imageUrl: formImageUrl || undefined
    }

    const updatedConfig = { ...localConfig }
    if (editingPrizeId) {
      updatedConfig[activeRank] = updatedConfig[activeRank].map(p => p.id === editingPrizeId ? newPrize : p)
    } else {
      updatedConfig[activeRank] = [...updatedConfig[activeRank], newPrize]
    }

    setLocalConfig(updatedConfig)
    setShowAddForm(false)
    resetForm()
  }

  const handleDeletePrize = (id: string) => {
    if (!confirm('Deseja realmente remover este prêmio?')) return
    const updatedConfig = { ...localConfig }
    updatedConfig[activeRank] = updatedConfig[activeRank].filter(p => p.id !== id)
    setLocalConfig(updatedConfig)
  }

  const handleEditPrize = (prize: DailyWheelPrize) => {
    setFormName(prize.name)
    setFormCategory(prize.category || '')
    setFormType(prize.type)
    setFormValue(prize.value)
    setFormProb(prize.probability)
    setFormColor(prize.color)
    setFormImageUrl(prize.imageUrl || '')
    setEditingPrizeId(prize.id)
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormName('')
    setFormCategory('')
    setFormType('balance')
    setFormValue(0)
    setFormProb(10)
    setFormColor('#10B981')
    setFormImageUrl('')
    setEditingPrizeId(null)
  }

  if (isLoading) return <LoadingPage />

  const currentPrizes = localConfig[activeRank] || []
  const totalProbability = currentPrizes.reduce((sum, p) => sum + p.probability, 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl flex items-center gap-3">
            <Trophy className="text-brand-500" />
            Roleta Diária por Rank
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure as premiações da roleta para cada nível de usuário.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => saveMutation.mutate(localConfig)}
          isLoading={saveMutation.isPending}
          leftIcon={<Save size={18} />}
        >
          Salvar Alterações
        </Button>
      </div>

      <div className="flex border-b border-surface-700 overflow-x-auto">
        {RANKS.map(rank => (
          <button
            key={rank}
            onClick={() => setActiveRank(rank)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeRank === rank 
                ? 'border-brand-500 text-brand-400 bg-brand-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-surface-800'
            }`}
          >
            {rank}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-surface-700 text-xs">
              {localConfig[rank]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      <Card className="min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Prêmios do {activeRank}</h2>
          {!showAddForm && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { resetForm(); setShowAddForm(true); }}
              leftIcon={<Plus size={16} />}
            >
              Adicionar Prêmio
            </Button>
          )}
        </div>

        {totalProbability > 0 && totalProbability !== 100 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm">
            <AlertCircle size={16} />
            A soma das probabilidades dos prêmios não é 100%. Atualmente é {totalProbability}%. O sistema usará as proporções como peso, mas o ideal é somar 100%.
          </div>
        )}

        {showAddForm && (
          <div className="bg-surface-800 border border-surface-700 p-4 rounded-xl mb-6">
            <h3 className="text-white font-medium mb-4">{editingPrizeId ? 'Editar Prêmio' : 'Novo Prêmio'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Prêmio (Visível na Roleta)</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                  placeholder="Ex: R$ 5,00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Categoria (Você cria)</label>
                <input 
                  type="text" 
                  value={formCategory} 
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                  placeholder="Ex: Eletrônicos, Saldo, Bônus..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">O que o sistema deve fazer?</label>
                <select 
                  value={formType} 
                  onChange={e => setFormType(e.target.value as PrizeType)}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="balance">Adicionar dinheiro ao Saldo</option>
                  <option value="physical">Apenas dar Parabéns (Não mexe no saldo)</option>
                  <option value="empty">Dizer "Tente Novamente" (Vazio)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Cor Base (Fundo e Destaque)</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={formColor} 
                    onChange={e => setFormColor(e.target.value)}
                    className="h-10 w-10 rounded bg-surface-900 border border-surface-700 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={formColor} 
                    onChange={e => setFormColor(e.target.value)}
                    className="flex-1 bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Probabilidade / Peso ({totalProbability - (editingPrizeId ? currentPrizes.find(p=>p.id===editingPrizeId)?.probability || 0 : 0) + Number(formProb)}%)
                </label>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={formProb} 
                  onChange={e => setFormProb(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                />
              </div>
              {formType === 'balance' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Valor em Reais (Para adicionar à carteira automaticamente)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={formValue} 
                      onChange={e => setFormValue(Number(e.target.value))}
                      className="w-full bg-surface-900 border border-surface-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Arquivo de Imagem (Opcional)</label>
                  <input 
                    type="text" 
                    value={formImageUrl} 
                    onChange={e => setFormImageUrl(e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                    placeholder="Ex: iphone.png"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Coloque a imagem do prêmio na pasta 'public' e digite o nome dela aqui, começando com barra (ex: /carro.png).</p>
                </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-surface-700">
              <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); resetForm(); }}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={handleSavePrize}>
                {editingPrizeId ? 'Atualizar Prêmio' : 'Adicionar à Roleta'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {currentPrizes.length === 0 && !showAddForm ? (
            <div className="text-center py-10 text-slate-500">
              Nenhum prêmio configurado para o rank {activeRank}.
            </div>
          ) : (
            currentPrizes.map(prize => (
              <div key={prize.id} className="flex items-center justify-between p-3 bg-surface-800 border border-surface-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner overflow-hidden" style={{ backgroundColor: `${prize.color}20`, color: prize.color }}>
                    {prize.imageUrl ? (
                      <img src={prize.imageUrl} alt={prize.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Trophy size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{prize.name}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 bg-surface-700 rounded-md text-[10px]">{prize.category || 'Geral'}</span>
                      {prize.type === 'balance' && <span>• R$ {prize.value.toFixed(2)}</span>}
                      <span>• Chance: {prize.probability}%</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditPrize(prize)} className="p-2 text-slate-400 hover:text-white bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDeletePrize(prize.id)} className="p-2 text-slate-400 hover:text-red-400 bg-surface-700 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
