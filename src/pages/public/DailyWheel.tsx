import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Lock, Wallet } from 'lucide-react'
import { HorizontalRoulette } from '@/components/box'
import { DepositModal } from '@/components/wallet/DepositModal'
import { addHours, isFuture } from 'date-fns'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function DailyWheel() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isSpinning, setIsSpinning] = useState(false)
  const [isDepositOpen, setIsDepositOpen] = useState(false)

  const userRank = profile?.rank || 'P Starter'

  const { data: wheelConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: ['daily_wheel_prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'daily_wheel_prizes')
        .maybeSingle()
      
      if (error) throw error
      return data?.value as Record<string, any> || null
    }
  })

  // Verifica se o usuário tem depósito aprovado nos últimos 14 dias
  const { data: hasRecentDeposit, isLoading: isCheckingDeposit } = useQuery({
    queryKey: ['recent_deposit_check', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('created_at', fourteenDaysAgo.toISOString())
      
      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!user
  })

  // Use config based on rank, or fallback
  const defaultFallback = [{ id: '1', name: 'Prêmio Surpresa', color: '#F59E0B', type: 'empty', value: 0, probability: 100 }]
  let prizes = wheelConfig && wheelConfig[userRank] ? wheelConfig[userRank] : defaultFallback
  if (prizes.length === 0) prizes = defaultFallback

  useEffect(() => {
    const savedCooldown = localStorage.getItem('@premios:dailyWheelCooldown')
    if (savedCooldown) {
      const parsedDate = new Date(savedCooldown)
      if (isFuture(parsedDate)) {
        setCooldownEnd(parsedDate)
      } else {
        localStorage.removeItem('@premios:dailyWheelCooldown')
      }
    }
  }, [])

  useEffect(() => {
    if (!cooldownEnd) return

    const interval = setInterval(() => {
      if (isFuture(cooldownEnd)) {
        const diff = cooldownEnd.getTime() - new Date().getTime()
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeRemaining(`${h}h ${m}m ${s}s`)
      } else {
        setCooldownEnd(null)
        localStorage.removeItem('@premios:dailyWheelCooldown')
        setTimeRemaining('')
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [cooldownEnd])

  const handleFinish = async (prize: any) => {
    setIsSpinning(false)
    
    if (prize.type === 'balance' && prize.value > 0) {
      try {
        const { error } = await (supabase as any).rpc('add_user_balance', { amount: prize.value })
        if (error) throw error
        toast.success(`Parabéns! Você ganhou: R$ ${prize.value.toFixed(2)} na carteira!`)
      } catch (err) {
        console.error('Erro ao adicionar saldo:', err)
        toast.error('Erro ao adicionar o saldo. Tente atualizar a página ou contate o suporte.')
      }
    } else if (prize.type === 'empty' || prize.name.toLowerCase().includes('tente')) {
      toast.error(`Que pena! ${prize.name}`)
    } else {
      toast.success(`Parabéns! Você ganhou: ${prize.name}`)
      // Save reward to user inventory
      try {
        await (supabase as any).rpc('add_user_reward', {
          p_name: prize.name,
          p_category: prize.category || 'Geral',
          p_image_url: prize.imageUrl || null,
          p_source: 'daily_wheel'
        })
      } catch (err) {
        console.error('Erro ao salvar recompensa:', err)
      }
    }
    
    // Set 24h cooldown
    const newCooldown = addHours(new Date(), 24)
    setCooldownEnd(newCooldown)
    localStorage.setItem('@premios:dailyWheelCooldown', newCooldown.toISOString())
  }

  return (
    <div className="min-h-screen bg-surface-950 pb-20 pt-8 lg:pt-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/perfil')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          <span>Voltar para o Perfil</span>
        </button>

        <div className="mb-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-medium text-sm mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Nível Atual: {userRank}
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl lg:text-5xl font-display font-bold text-white mb-4"
          >
            Roleta Diária
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 max-w-xl mx-auto"
          >
            A cada 24 horas, você receberá um giro grátis no giro diário, desde que sua conta tenha realizado depósitos nos últimos 14 dias. As recompensas obtidas no giro diário são determinadas pelo quão ativo você foi nas 24 horas.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-900 border border-surface-800 p-8 lg:p-12 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center min-h-[400px]"
        >
          {/* Decorative background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          {isCheckingDeposit ? (
            <div className="absolute inset-0 z-30 bg-surface-900/80 backdrop-blur-sm flex items-center justify-center">
              <span className="text-slate-400 font-medium animate-pulse">Verificando elegibilidade...</span>
            </div>
          ) : !hasRecentDeposit ? (
            <div className="absolute inset-0 z-30 bg-surface-900/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center mb-6 shadow-xl relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-50"></div>
                <Lock className="text-red-500 relative z-10" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Roleta Bloqueada</h2>
              <p className="text-slate-400 max-w-md mb-8">
                Para ter acesso aos giros grátis, é necessário ter realizado pelo menos um depósito nos últimos <strong className="text-white">14 dias</strong>. Sua roleta será reativada assim que um novo depósito for aprovado!
              </p>
              
              <button
                onClick={() => setIsDepositOpen(true)}
                className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold transition-all shadow-lg hover:-translate-y-1 flex items-center gap-2"
              >
                <Wallet size={18} />
                Fazer Depósito Agora
              </button>
            </div>
          ) : cooldownEnd ? (
            <div className="absolute inset-0 z-20 bg-surface-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center mb-6 shadow-xl">
                <Clock className="text-amber-500" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Roleta em Recarga</h2>
              <p className="text-slate-400 max-w-sm mb-8">
                Você já utilizou seu giro diário. Volte quando o cronômetro zerar para tentar a sorte novamente!
              </p>
              
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-3">Próximo giro em</span>
                <div className="bg-surface-950 border border-surface-800 rounded-2xl px-8 py-4 flex gap-4 text-center">
                  <div className="text-3xl font-display font-bold text-amber-500 font-mono">
                    {timeRemaining || 'Calculando...'}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/perfil')}
                className="mt-8 px-6 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-white font-medium transition-colors border border-surface-700"
              >
                Voltar ao Perfil
              </button>
            </div>
          ) : null}

          {/* Prêmios Disponíveis */}
          <div className="relative z-10 w-full mb-12">
            <h3 className="text-slate-400 font-medium mb-6 text-center text-sm uppercase tracking-widest">Possíveis Prêmios ({userRank})</h3>
            {isConfigLoading ? (
              <p className="text-center text-slate-500 text-sm">Carregando prêmios...</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {prizes.map((p: any) => (
                  <div key={p.id} className="px-4 py-2 rounded-xl border border-surface-700 bg-surface-800/50 flex items-center gap-2 shadow-sm">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: p.color || '#F59E0B', color: p.color || '#F59E0B' }} />
                    <span className="text-sm font-bold text-slate-200">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 w-full mt-4 flex flex-col items-center overflow-hidden">
            {!isConfigLoading && (
              <HorizontalRoulette 
                prizes={prizes} 
                onFinish={handleFinish}
                isSpinning={isSpinning}
              />
            )}

            {!cooldownEnd && !isConfigLoading && (
              <button 
                onClick={() => {
                  if (!isSpinning) setIsSpinning(true);
                }}
                disabled={isSpinning}
                className="mt-12 bg-brand-500 hover:bg-brand-600 text-white font-display font-bold text-xl px-12 py-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 z-10 relative"
              >
                {isSpinning ? 'GIRANDO...' : 'GIRAR ROLETA'}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <DepositModal 
        isOpen={isDepositOpen} 
        onClose={() => setIsDepositOpen(false)} 
      />
    </div>
  )
}
