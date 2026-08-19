import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Phone, FileText, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Turnstile } from '@marsidev/react-turnstile'
import toast from 'react-hot-toast'

interface FastCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function FastCheckoutModal({ isOpen, onClose, onSuccess }: FastCheckoutModalProps) {
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phone: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target
    
    // Simple masks
    if (name === 'cpf') {
      value = value.replace(/\D/g, '')
      if (value.length > 11) value = value.slice(0, 11)
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    if (name === 'phone') {
      value = value.replace(/\D/g, '')
      if (value.length > 11) value = value.slice(0, 11)
      if (value.length === 11) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      } else if (value.length === 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanPhone = formData.phone.replace(/\D/g, '')
    const cleanCpf = formData.cpf.replace(/\D/g, '')
    
    if (cleanPhone.length < 10) {
      toast.error('Telefone inválido.')
      return
    }
    if (cleanCpf.length !== 11) {
      toast.error('CPF inválido.')
      return
    }
    if (formData.name.trim().length < 3) {
      toast.error('Nome inválido.')
      return
    }
    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (!captchaToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      toast.error('Por favor, complete a verificação de segurança.')
      return
    }

    setLoading(true)
    
    try {
      // 1. Generate fake email and use provided password
      const email = `${cleanPhone}@users.premiaja.com`
      const password = formData.password

      // 2. Register or Login
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: formData.name,
          },
          captchaToken: captchaToken || undefined,
        }
      })

      if (error) {
        // Se o usuário já existe (alguém com esse número já comprou antes)
        if (error.message.includes('User already registered') || error.status === 422) {
          // Vamos tentar logar ele
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
            options: { captchaToken: captchaToken || undefined }
          })
          
          if (signInError) {
             throw new Error('Conta já existe com esse número, mas o CPF(senha) não confere.')
          }
        } else {
           throw error
        }
      }

      // 3. Atualizar profile com CPF e Telefone
      const user = (await supabase.auth.getUser()).data.user
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            cpf: cleanCpf,
            phone: cleanPhone,
            full_name: formData.name // Garante que o nome ta atualizado
          })
          .eq('id', user.id)
          
        if (profileError) {
          console.error("Profile update error:", profileError)
          // Don't throw, we can still proceed with checkout
        }
      }

      toast.success('Pronto! Criando seu pedido...')
      onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao processar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 m-auto h-fit max-h-[90vh] w-full max-w-md overflow-y-auto p-4 sm:p-6"
          >
            <div className="relative rounded-2xl bg-surface-800 border border-surface-700 p-6 shadow-xl">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <h3 className="font-display text-xl font-bold text-white mb-1">
                  Finalizar Participação
                </h3>
                <p className="text-sm text-slate-400">
                  Informe seus dados para garantir seus bilhetes.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Nome Completo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">WhatsApp</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none text-sm"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Senha (para acessar depois)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <FileText size={16} />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-10 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none text-sm"
                      placeholder="Sua senha (min. 6 caracteres)"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <span className="text-xs mr-1">{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">CPF</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <FileText size={16} />
                    </div>
                    <input
                      type="text"
                      name="cpf"
                      required
                      value={formData.cpf}
                      onChange={handleChange}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Seu CPF será usado como senha caso precise acessar sua carteira depois.</p>
                </div>

                {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center mt-4">
                    <Turnstile
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onSuccess={setCaptchaToken}
                      options={{ theme: 'dark' }}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  className="w-full mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>Continuar para Pagamento <ArrowRight size={18} className="ml-2" /></>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
