import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Mail, Lock, Eye, EyeOff, Phone, FileText, UserSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Turnstile } from '@marsidev/react-turnstile'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isAdminMode, setIsAdminMode] = useState(new URLSearchParams(location.search).get('admin') === 'true')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  
  const [phone, setPhone] = useState('')
  const [clientPassword, setClientPassword] = useState('')
  
  // Admin mode state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from = (location.state as { from?: Location })?.from?.pathname || '/'

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    // Se só tiver números e caracteres de formatação de telefone, aplicar a máscara
    if (/^[\d\s()+-]*$/.test(value)) {
      let digits = value.replace(/\D/g, '')
      if (digits.length > 11) digits = digits.slice(0, 11)
      if (digits.length === 11) {
        value = digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      } else if (digits.length === 10) {
        value = digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
      } else {
        value = digits
      }
    }
    setPhone(value)
  }


  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let loginEmail = phone.trim()
    
    if (!loginEmail.includes('@')) {
      const cleanPhone = loginEmail.replace(/\D/g, '')
      if (cleanPhone.length < 10) {
        toast.error('Preencha os dados corretamente')
        return
      }
      loginEmail = `${cleanPhone}@users.premiaja.com`
    }

    if (clientPassword.length < 6) {
      toast.error('Preencha os dados corretamente')
      return
    }

    if (!captchaToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      toast.error('Por favor, complete a verificação de segurança.')
      return
    }

    setIsSubmitting(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: clientPassword,
      options: { captchaToken: captchaToken || undefined }
    })

    if (error) {
      toast.error('Conta não encontrada ou senha incorreta.')
      setIsSubmitting(false)
      return
    }

    toast.success('Bem-vindo de volta! 🎉')
    navigate(from, { replace: true })
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    if (!captchaToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      toast.error('Por favor, complete a verificação de segurança.')
      return
    }

    setIsSubmitting(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captchaToken || undefined }
    })

    if (error) {
      toast.error('E-mail ou senha incorretos')
      setIsSubmitting(false)
      return
    }

    toast.success('Acesso Admin liberado! 🎉')
    navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-hero-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/logo-rodape.png" 
            alt="P DE PREMIA" 
            className="h-16 w-auto object-contain mx-auto mb-6 drop-shadow-[0_0_15px_rgba(147,51,234,0.3)]" 
          />
          <h1 className="font-display font-bold text-white text-2xl mb-1">Entrar na conta</h1>
          <p className="text-slate-400 text-sm">
            Acompanhe seus bilhetes e prêmios
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <AnimatePresence mode="wait">
            {!isAdminMode ? (
              <motion.form 
                key="client"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleClientSubmit} 
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">E-mail ou WhatsApp</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none"
                      placeholder="seu@email.com ou (11) 99999-9999"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center mb-1.5 mt-4">
                    <label className="text-sm font-medium text-slate-300">Senha</label>
                    <Link to="/esqueci-senha" className="text-xs text-brand-400 hover:text-brand-300">
                      Esqueceu?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl pl-10 pr-10 py-2.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors outline-none"
                      placeholder="Sua senha"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
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
                  variant="primary"
                  size="lg"
                  className="w-full mt-6"
                  isLoading={isSubmitting}
                >
                  Entrar
                </Button>
              </motion.form>
            ) : (
              <motion.form 
                key="admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleAdminSubmit} 
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <Badge variant="brand" size="sm" className="mb-2">Acesso Restrito</Badge>
                </div>
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="admin@email.com"
                  leftElement={<Mail size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftElement={<Lock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

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
                  variant="brand"
                  size="lg"
                  className="w-full mt-6"
                  isLoading={isSubmitting}
                >
                  Entrar no Painel
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Toggle Mode (Oculto) */}
        {/*
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className="text-slate-500 hover:text-brand-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <UserSquare size={16} />
            {isAdminMode ? 'Voltar para login de cliente' : 'Acesso para Organizadores'}
          </button>
        </div>
        */}

        {/* Trust signal */}
        <p className="text-center text-slate-600 text-xs mt-6">
          🔒 Seus dados são protegidos com criptografia de ponta a ponta
        </p>
      </motion.div>
    </div>
  )
}
