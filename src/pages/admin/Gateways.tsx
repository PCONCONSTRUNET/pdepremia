import { useState, useEffect } from 'react'
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminGateways() {
  const [ci, setCi] = useState('')
  const [cs, setCs] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'misticpay_config')
        .maybeSingle()

      if (data?.value) {
        setCi((data.value as any).ci || '')
        setCs((data.value as any).cs || '')
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    const payload = { ci, cs }
    
    // Usa upsert garantindo que crie ou atualize baseado na chave única
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'misticpay_config', value: payload }, { onConflict: 'key' })
      
    if (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar as configurações.')
      return
    }

    toast.success('Configurações salvas no banco com sucesso!')
  }

  const handleTestConnection = async () => {
    if (!ci || !cs) {
      toast.error('Preencha o Client ID e Client Secret antes de testar.')
      return
    }

    setIsTesting(true)
    setConnectionStatus('idle')

    try {
      // Chama a nossa Edge Function para contornar o CORS
      const { data, error } = await supabase.functions.invoke('misticpay-gateway/test', {
        body: { ci, cs }
      })

      if (error || !data?.success) {
        setConnectionStatus('error')
        toast.error('Credenciais inválidas ou erro na conexão MisticPay.')
      } else {
        setConnectionStatus('success')
        toast.success('Conexão estabelecida com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setConnectionStatus('error')
      toast.error('Erro de servidor ao testar a conexão.')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Gateways de Pagamento</h1>
        <p className="text-slate-400 text-sm">Gerencie os métodos de pagamento automáticos e manuais</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <Card>
          <h2 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-brand-400" />
            Gateway Ativo (Automático)
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Selecione o Gateway</label>
              <select className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-500 transition-colors">
                <option value="misticpay">MisticPay</option>
                <option value="suitpay" disabled>Suitpay (Em Breve)</option>
                <option value="mercadopago" disabled>Mercado Pago (Em Breve)</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                Você pode adicionar múltiplos gateways no futuro. No momento, o sistema está integrado com a MisticPay.
              </p>
            </div>
            
            <div className="p-5 bg-surface-800/50 rounded-xl border border-surface-700 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-400" />
                  Credenciais MisticPay
                </h3>
                {connectionStatus === 'success' && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 size={12} /> Conectado
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> Erro de Conexão
                  </span>
                )}
                {connectionStatus === 'idle' && (
                  <span className="text-xs bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full font-medium">
                    Configuração Ativa
                  </span>
                )}
              </div>
              
              <Input 
                label="Client ID (ci)" 
                placeholder="Insira o seu Client ID da MisticPay" 
                value={ci}
                onChange={(e) => setCi(e.target.value)}
              />
              <Input 
                label="Client Secret (cs)" 
                type="password" 
                placeholder="Insira o seu Client Secret da MisticPay" 
                value={cs}
                onChange={(e) => setCs(e.target.value)}
              />
              <Input 
                label="URL do Webhook (Copie e cole na MisticPay)" 
                value={`${import.meta.env.VITE_SUPABASE_URL || 'https://[SEU-PROJETO].supabase.co'}/functions/v1/misticpay-webhook`}
                readOnly
                className="bg-surface-900/50 text-brand-400 font-mono text-sm"
              />
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-400">
                  <strong>Segurança:</strong> O seu Client Secret será armazenado de forma criptografada no banco de dados e nunca será enviado para o front-end dos usuários. As transações PIX são geradas de forma segura via backend (Edge Functions).
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="lg" onClick={handleSave}>
            Salvar Configurações
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleTestConnection}
            disabled={isTesting || !ci || !cs}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            {isTesting ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Testando...
              </>
            ) : (
              'Ativar e Testar Conexão'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
