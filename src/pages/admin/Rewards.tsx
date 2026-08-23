import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Ticket, Search, Edit2, Trash2, X, Play, Square, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/common/Loading'

type PromoCode = {
  id: string
  code: string
  reward_type: string
  reward_amount: number
  reward_duration: number | null
  reward_reference_id: string | null
  max_uses: number | null
  current_uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export default function Rewards() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    reward_type: 'balance',
    reward_amount: '',
    reward_duration: '',
    reward_reference_id: '',
    max_uses: '',
    expires_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [boxes, setBoxes] = useState<any[]>([])
  const [wheels, setWheels] = useState<any[]>([])

  const fetchDependencies = async () => {
    try {
      const [boxesRes, wheelsRes] = await Promise.all([
        supabase.from('boxes').select('id, name'),
        supabase.from('wheels').select('id, title')
      ])
      if (boxesRes.data) setBoxes(boxesRes.data)
      if (wheelsRes.data) setWheels(wheelsRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchPromoCodes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPromoCodes(data || [])
    } catch (err: any) {
      console.error('Error fetching promo codes:', err)
      // Ignore if table doesn't exist yet while user hasn't run the SQL
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromoCodes()
    fetchDependencies()
  }, [])

  const handleOpenModal = (code: PromoCode | null = null) => {
    if (code) {
      setEditingCode(code)
      setFormData({
        code: code.code,
        reward_type: code.reward_type,
        reward_amount: code.reward_amount.toString(),
        reward_duration: code.reward_duration?.toString() || '',
        reward_reference_id: code.reward_reference_id || '',
        max_uses: code.max_uses?.toString() || '',
        expires_at: code.expires_at ? new Date(code.expires_at).toISOString().slice(0, 16) : '',
      })
    } else {
      setEditingCode(null)
      setFormData({
        code: '',
        reward_type: 'balance',
        reward_amount: '',
        reward_duration: '',
        reward_reference_id: '',
        max_uses: '',
        expires_at: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCode(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code || !formData.reward_amount) {
      toast.error('Preencha os campos obrigatórios (Código e Valor).')
      return
    }

    try {
      setSaving(true)
      
      const payload = {
        code: formData.code.toUpperCase(),
        reward_type: formData.reward_type,
        reward_amount: parseFloat(formData.reward_amount) || 1, // Fallback for boxes/roulettes if not applicable
        reward_duration: formData.reward_duration ? parseInt(formData.reward_duration) : null,
        reward_reference_id: formData.reward_reference_id || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      }

      if (editingCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(payload)
          .eq('id', editingCode.id)

        if (error) throw error
        toast.success('Código atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([payload])

        if (error) {
          if (error.code === '23505') {
            toast.error('Este código promocional já existe.')
            return
          }
          throw error
        }
        toast.success('Código criado com sucesso!')
      }

      handleCloseModal()
      fetchPromoCodes()
    } catch (err: any) {
      console.error('Error saving promo code:', err)
      toast.error('Erro ao salvar o código promocional.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (code: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id)

      if (error) throw error
      
      toast.success(`Código ${code.is_active ? 'desativado' : 'ativado'} com sucesso!`)
      fetchPromoCodes()
    } catch (err: any) {
      console.error('Error toggling status:', err)
      toast.error('Erro ao alterar status do código.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este código promocional? Esta ação não pode ser desfeita e os resgates associados também serão excluídos.')) return

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Código excluído com sucesso!')
      fetchPromoCodes()
    } catch (err: any) {
      console.error('Error deleting code:', err)
      toast.error('Erro ao excluir código.')
    }
  }

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case 'balance': return 'Saldo (R$)'
      case 'xp_multiplier': return 'XP Duplo/Multiplicador'
      case 'cashback': return 'Cashback (%)'
      case 'roulette': return 'Giro em Roleta Criada'
      case 'daily_spin': return 'Giro na Roleta Diária'
      case 'box': return 'Abertura de Box'
      default: return type
    }
  }

  const filteredCodes = promoCodes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-1">Recompensas</h1>
          <p className="text-slate-400 text-sm">Crie e gerencie códigos promocionais e bônus para os usuários.</p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => handleOpenModal()}
        >
          Novo Código Promocional
        </Button>
      </div>

      <div className="bg-surface-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Recompensa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Usos</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Expiração</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Nenhum código encontrado.
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Ticket size={16} className="text-brand-400" />
                        <span className="font-mono font-bold text-white uppercase">{code.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {getRewardTypeLabel(code.reward_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-400">
                      {code.reward_type === 'balance' 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(code.reward_amount)
                        : code.reward_type === 'cashback'
                          ? `${code.reward_amount}%`
                          : code.reward_type === 'daily_spin'
                            ? `${code.reward_amount} giro(s)`
                            : `${code.reward_amount}x`
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {code.current_uses} {code.max_uses ? `/ ${code.max_uses}` : '(Ilimitado)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {code.expires_at 
                        ? format(new Date(code.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        code.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {code.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(code)}
                          className={`p-2 rounded-lg transition-colors ${
                            code.is_active 
                              ? 'text-red-400 hover:bg-red-400/10' 
                              : 'text-emerald-400 hover:bg-emerald-400/10'
                          }`}
                          title={code.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {code.is_active ? <Square size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => handleOpenModal(code)}
                          className="p-2 text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleCloseModal}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-surface-700 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <Ticket className="text-brand-400" size={24} />
                  {editingCode ? 'Editar Código Promocional' : 'Novo Código Promocional'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Código (Letras Maiúsculas)*</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: PREMIA2024"
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors uppercase font-mono tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Recompensa*</label>
                    <select
                      value={formData.reward_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_type: e.target.value }))}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="balance">Saldo na Carteira</option>
                      <option value="xp_multiplier">Multiplicador de XP</option>
                      <option value="cashback">Cashback (%)</option>
                      <option value="roulette">Giro em Roleta Criada</option>
                      <option value="daily_spin">Giro na Roleta Diária</option>
                      <option value="box">Box (Caixa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {formData.reward_type === 'box' || formData.reward_type === 'roulette' || formData.reward_type === 'daily_spin'
                        ? 'Quantidade' 
                        : 'Valor/Multiplicador*'}
                    </label>
                    <input
                      type="number"
                      step={formData.reward_type === 'balance' ? '0.01' : '1'}
                      required
                      value={formData.reward_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_amount: e.target.value }))}
                      placeholder={
                        formData.reward_type === 'balance' ? '50.00' 
                        : formData.reward_type === 'box' ? '1' 
                        : '2'
                      }
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {formData.reward_type === 'box' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Qual Box?*</label>
                    <select
                      required
                      value={formData.reward_reference_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_reference_id: e.target.value }))}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="">Selecione uma Box...</option>
                      {boxes.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.reward_type === 'roulette' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Qual Roleta?*</label>
                    <select
                      required
                      value={formData.reward_reference_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_reference_id: e.target.value }))}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white focus:border-brand-500 focus:outline-none transition-colors appearance-none"
                    >
                      <option value="">Selecione uma Roleta...</option>
                      {wheels.map(w => (
                        <option key={w.id} value={w.id}>{w.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(formData.reward_type === 'xp_multiplier' || formData.reward_type === 'cashback') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duração da Recompensa (Em segundos)</label>
                    <input
                      type="number"
                      value={formData.reward_duration}
                      onChange={(e) => setFormData(prev => ({ ...prev, reward_duration: e.target.value }))}
                      placeholder="Ex: 7200 (para 2 horas)"
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">Deixe em branco para tempo ilimitado.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Limite de Usos (Max)</label>
                    <input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                      placeholder="Ilimitado"
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Data de Expiração</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                      className="w-full bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

              </form>

              <div className="p-6 border-t border-surface-700 bg-surface-900/50 shrink-0 flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  onClick={handleSave}
                  isLoading={saving}
                  leftIcon={<Save size={18} />}
                >
                  Salvar Código
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
