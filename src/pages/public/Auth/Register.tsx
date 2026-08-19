import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Star, Mail, Lock, User, Phone, Eye, EyeOff, FileText, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { maskPhone, maskCPF } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Turnstile } from '@marsidev/react-turnstile'

export default function Register() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    if (!captchaToken && import.meta.env.VITE_TURNSTILE_SITE_KEY) {
      toast.error('Por favor, complete a verificação de segurança.')
      return
    }

    const cleanPhone = data.phone.replace(/\D/g, '')
    const cleanCpf = data.cpf.replace(/\D/g, '')
    const loginEmail = `${cleanPhone}@users.premiaja.com`

    // Pre-check for duplicate CPF or Phone
    const { data: isDuplicate, error: rpcError } = await supabase.rpc('check_duplicate_user', {
      p_cpf: cleanCpf,
      p_phone: cleanPhone
    })

    if (isDuplicate) {
      toast.error('Este CPF ou Telefone já está cadastrado em outra conta!')
      return
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: loginEmail,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone: cleanPhone,
          cpf: cleanCpf,
        },
        captchaToken: captchaToken || undefined,
      },
    })

    if (authData?.user) {
      // Force update the profile since the trigger might not map these fields
      await supabase.from('profiles').update({ 
        cpf: cleanCpf, 
        phone: cleanPhone,
        birth_date: data.birth_date
      }).eq('id', authData.user.id)
    }

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este CPF ou Telefone já está cadastrado. Tente entrar.')
      } else {
        toast.error(`Erro: ${error.message}`)
      }
      return
    }

    toast.success('Conta criada com sucesso! 🎉')
    navigate('/')
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
          <h1 className="font-display font-bold text-white text-2xl mb-1">Criar conta grátis</h1>
          <p className="text-slate-400 text-sm">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Entrar
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Nome completo"
              placeholder="Seu nome completo"
              leftElement={<User size={16} />}
              error={errors.full_name?.message}
              autoComplete="name"
              required
              {...register('full_name')}
            />

            <Input
              label="CPF"
              type="text"
              placeholder="000.000.000-00"
              leftElement={<FileText size={16} />}
              error={errors.cpf?.message}
              required
              {...register('cpf', {
                onChange: (e) => {
                  e.target.value = maskCPF(e.target.value)
                }
              })}
            />

            <Input
              label="Telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              leftElement={<Phone size={16} />}
              error={errors.phone?.message}
              hint="Opcional — para contato sobre prêmios"
              autoComplete="tel"
              {...register('phone', {
                onChange: (e) => {
                  e.target.value = maskPhone(e.target.value)
                }
              })}
            />

            <Input
              label="Data de Nascimento"
              type="date"
              leftElement={<Calendar size={16} />}
              error={errors.birth_date?.message}
              required
              {...register('birth_date')}
            />

            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              leftElement={<Lock size={16} />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password?.message}
              autoComplete="new-password"
              required
              {...register('password')}
            />

            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center my-4">
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={setCaptchaToken}
                  options={{ theme: 'dark' }}
                />
              </div>
            )}

            <div className="flex items-start space-x-3 my-4">
              <input
                type="checkbox"
                id="terms"
                {...register('terms')}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
                Confirmo que tenho mais de 18 anos de idade e li e concordo com os{' '}
                <Link to="/termos" className="text-brand-400 hover:underline">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" className="text-brand-400 hover:underline">
                  Políticas de Privacidade
                </Link>.
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-500 mt-1">{errors.terms.message}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Criar conta
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
