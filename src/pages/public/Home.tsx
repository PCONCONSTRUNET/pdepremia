import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Ticket, Clock, Shield, Zap, Star, ChevronRight, Gift,
  CheckCircle, Users, Award, ArrowRight, Sparkles, Gamepad2, Dices, PackageOpen, Target
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, maskName, formatNumber } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CardSkeleton } from '@/components/common/Loading'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { Winner } from '@/types'
import { minigames } from '@/config/games'
import { useFavorites } from '@/hooks/useFavorites'

// ─── Data fetching ────────────────────────────────────────────────────────────

function usePublicBoxes() {
  return useQuery({
    queryKey: ['boxes', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

function usePublicCampaigns() {
  return useQuery({
    queryKey: ['campaigns', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

function usePublicWinners() {
  return useQuery({
    queryKey: ['winners', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winners')
        .select('*, campaign:campaigns(name), prize:prizes!inner(name, prize_type)')
        .eq('is_public', true)
        .not('prize.name', 'ilike', '%tente novamente%')
        .order('won_at', { ascending: false })
        .limit(8)

      if (error) throw error
      return data
    },
  })
}

// ─── Banner Carousel ────────────────────────────────────────────────────────────

function BannerCarousel() {
  const banners = [
    '/CAPA 1 DESKTOP.png',
    '/CAPA 2 DESKTOP.png',
    '/CAPA 3 DESKTOP.png',
    '/CAPA 4 DESKTOP.png'
  ]
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  return (
    <div className="w-full relative flex items-center justify-center">
      {banners.map((banner, index) => (
        <motion.img
          key={banner}
          src={banner}
          alt={`Banner Promoção ${index + 1}`}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          initial={false}
          animate={{ 
            opacity: index === currentIndex ? 1 : 0,
            x: index === currentIndex ? 0 : (index > currentIndex ? 20 : -20),
            zIndex: index === currentIndex ? 10 : 0
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className={`w-full select-none pointer-events-none object-contain ${
            index === currentIndex ? 'relative h-auto' : 'absolute top-0 left-0 h-full'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-6 sm:py-8 bg-hero-gradient">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold-500/3 blur-3xl" />
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
          {/* Promotional Banner Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 relative rounded-3xl overflow-hidden shadow-2xl shadow-brand-500/10 border border-white/5 flex"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-surface-900/50 via-transparent to-transparent z-10 pointer-events-none" />
            
            <div className="relative w-full h-auto flex items-center justify-center overflow-hidden group">
              <BannerCarousel />
            </div>
          </motion.div>

          {/* Telegram Card */}
          <motion.a
            href="https://t.me/pdepremia"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="hidden lg:block w-full lg:w-[350px] shrink-0 hover:scale-[1.02] transition-transform duration-300"
          >
            <img 
              src="/card telegram.png" 
              alt="Grupo Telegram" 
              className="w-full h-auto object-contain drop-shadow-2xl"
            />
          </motion.a>
        </div>
      </div>
    </section>
  )
}

// ─── Minigames Hub ─────────────────────────────────────────────────────────────

function MinigamesSection() {
  return (
    <section className="py-16 sm:py-24 relative z-20 bg-surface-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-sm font-medium mb-2">🎮 Diversão garantida</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl">
            Central de Minigames
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Escolha o seu jogo favorito e teste a sua sorte agora mesmo!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {minigames.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="h-full"
            >
              <Link to={game.to} className="block h-full group">
                <MinigameCardContent game={game} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MinigameCardContent({ game }: { game: any }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorite = isFavorite(game.id)

  return (
    <div className={`rounded-3xl overflow-hidden glass p-1 h-full hover:scale-[1.02] transition-transform duration-300 relative`}>
      <button 
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleFavorite(game.id)
        }}
        className="absolute top-4 left-4 z-30 p-2 rounded-full bg-surface-900/50 hover:bg-surface-800 transition-colors border border-white/5 shadow-lg backdrop-blur-sm"
      >
        <Star size={20} className={favorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'} />
      </button>

      <div className="rounded-2xl p-5 sm:p-8 h-full flex flex-col items-center text-center border border-white/5 bg-surface-800/80 relative overflow-hidden">
        {/* Glow Effects */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl ${game.theme.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        {game.isNew && (
          <span className="absolute top-4 right-4 bg-brand-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg z-10">
            Novo
          </span>
        )}
        
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 relative z-10 group-hover:-translate-y-2 transition-transform duration-300 ${game.theme.iconBg}`}>
          {game.icon}
        </div>
        
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 relative z-10">{game.title}</h3>
        <p className="text-xs sm:text-sm text-slate-400 relative z-10">{game.description}</p>
        
        <div className="mt-5 sm:mt-8 relative z-10 w-full mt-auto pt-3 sm:pt-4">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
            Jogar Agora <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Boxes Section ─────────────────────────────────────────────────────────────

function BoxesSection() {
  const { data: boxes, isLoading } = usePublicBoxes()
  const navigate = useNavigate()

  const handleBuyClick = () => {
    navigate('/boxes')
  }

  // Mapeamento de estilos visuais baseados no índice (para manter a estética)
  const boxStyles = [
    { 
      color: 'text-slate-300', 
      bg: 'bg-slate-400/10',
      priceBg: 'bg-slate-500/10 border-slate-400/20',
      btn: 'bg-slate-700 hover:bg-slate-600 text-white'
    },
    { 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10',
      priceBg: 'bg-blue-500/10 border-blue-500/20',
      btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
    },
    { 
      color: 'text-purple-400', 
      bg: 'bg-purple-400/10',
      priceBg: 'bg-purple-500/10 border-purple-500/20',
      btn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
    },
    { 
      color: 'text-gold-400', 
      bg: 'bg-gold-400/10',
      priceBg: 'bg-gold-500/10 border-gold-500/20',
      btn: 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]'
    },
  ]

  if (isLoading) {
    return (
      <section className="py-16 sm:py-24 bg-surface-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!boxes || boxes.length === 0) return null

  return (
    <section id="boxes" className="py-16 sm:py-24 bg-surface-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-sm font-medium mb-2">📦 Surpresas em cada pacote</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl">
            Conheça as nossas Boxes
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Compre nossas exclusivas Boxes da Sorte.
            Quanto mais rara a Box, melhor o prêmio que pode vir dentro dela!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {boxes.map((box, i) => {
            const style = boxStyles[i % boxStyles.length]
            return (
              <motion.div
                key={box.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-3xl overflow-hidden glass p-1 text-center group hover:scale-[1.02] transition-transform duration-300 flex flex-col"
              >
                <div className="rounded-2xl p-6 flex-1 flex flex-col border border-white/5 bg-surface-800/50 relative overflow-hidden">
                  <div className={`absolute inset-0 ${style.bg} opacity-20 group-hover:opacity-40 transition-opacity`} />
                  
                  <div className="flex justify-center mb-4 relative z-10">
                    <img src="/logo-rodape.png" alt="P DE PREMIA" className="h-8 w-auto object-contain opacity-80" />
                  </div>
                  
                  <div className="relative mb-6 flex justify-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
                      <div className={`absolute inset-0 ${style.bg} rounded-full blur-2xl opacity-50`} />
                      {box.image_url ? (
                        <img 
                          src={box.image_url} 
                          alt={box.name} 
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          className="w-full h-full object-contain relative z-10 drop-shadow-2xl group-hover:rotate-3 transition-transform select-none pointer-events-none"
                        />
                      ) : (
                        <Gift size={64} className={`${style.color} relative z-10`} />
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-auto relative z-10 flex flex-col items-center">
                    <h3 className={`font-display font-bold text-xl mb-1 ${style.color}`}>{box.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 min-h-[32px]">{box.description}</p>
                    
                    <div className={`w-full ${style.priceBg} rounded-xl p-3 border mb-4`}>
                      <p className={`text-xs mb-0.5 opacity-80 ${style.color}`}>Preço</p>
                      <p className={`font-display font-bold text-xl ${style.color}`}>
                        {formatCurrency(box.price ?? 0)}
                      </p>
                    </div>

                    <button
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${style.btn}`}
                      onClick={() => handleBuyClick()}
                    >
                      Comprar Box
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

    </section>
  )
}

function CampaignCountdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime()
      if (difference <= 0) return 'Finalizado'

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)

      if (days > 0) return `${days}d ${hours}h ${minutes}m`
      return `${hours}h ${minutes}m ${seconds}s`
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-950/80 backdrop-blur-md border border-white/10 shadow-lg">
      <Clock size={12} className="text-brand-400" />
      <span className="text-white text-[10px] font-bold tabular-nums tracking-wider">{timeLeft}</span>
    </div>
  )
}

// ─── Campaigns Section ─────────────────────────────────────────────────────────

function CampaignsSection() {
  const { data: campaigns, isLoading } = usePublicCampaigns()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <section className="py-16 sm:py-24 bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!campaigns || campaigns.length === 0) return null

  return (
    <section id="sorteios" className="py-16 sm:py-24 bg-surface-950 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-sm font-medium mb-2">🎟️ Participe e ganhe</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl">
            Nossos Sorteios
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Escolha um sorteio e concorra a prêmios incríveis!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign, i) => {
            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-3xl overflow-hidden glass p-1 group hover:scale-[1.02] transition-transform duration-300 flex flex-col h-full cursor-pointer"
                onClick={() => navigate('/sorteios')}
              >
                <div className="rounded-2xl flex-1 flex flex-col bg-surface-800/80 relative overflow-hidden border border-white/5">
                  <div className="h-32 sm:h-48 relative overflow-hidden bg-surface-900 flex items-center justify-center">
                    {campaign.banner_url ? (
                      <img 
                        src={campaign.banner_url} 
                        alt={campaign.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 flex items-center justify-center">
                        <Gift size={40} className="text-brand-400/50 sm:w-12 sm:h-12" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      {campaign.end_date ? (
                        <CampaignCountdown endDate={campaign.end_date} />
                      ) : (
                        <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg">
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-lg sm:text-xl text-white mb-2 line-clamp-2">
                      {campaign.name}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-6 flex-1">
                      {campaign.description || 'Participe deste sorteio exclusivo e concorra a prêmios fantásticos.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Valor do bilhete</p>
                        <p className="font-display font-bold text-brand-400 text-lg">
                          {formatCurrency(campaign.ticket_price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-emerald-500/20 hidden sm:inline-block">
                          Ativo
                        </span>
                        <Button variant="primary" size="sm" className="px-6 rounded-xl group-hover:shadow-[0_0_15px_rgba(99,116,241,0.3)] transition-all">
                          Participar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── How it Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      icon: <Ticket size={28} className="text-brand-400" />,
      step: '01',
      title: 'Escolha sua campanha',
      description: 'Navegue pelas campanhas ativas e escolha aquela com os prêmios que você deseja conquistar.',
    },
    {
      icon: <Star size={28} className="text-gold-400" />,
      step: '02',
      title: 'Adquira seus bilhetes',
      description: 'Selecione a quantidade de bilhetes ou pacotes especiais com boxes e roletas inclusos.',
    },
    {
      icon: <Zap size={28} className="text-emerald-400" />,
      step: '03',
      title: 'Revele e ganhe',
      description: 'Após confirmar o pagamento, acesse sua carteira, revele seus bilhetes e descubra seus prêmios.',
    },
    {
      icon: <Trophy size={28} className="text-violet-400" />,
      step: '04',
      title: 'Receba o prêmio',
      description: 'Prêmios confirmados são registrados na sua conta. Nossa equipe cuida da entrega.',
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-surface-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-brand-400 text-sm font-medium mb-2">Simples assim</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl">
            Como funciona
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            Da participação até o recebimento do prêmio, tudo é simples, rápido e totalmente transparente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card variant="glass" className="h-full relative overflow-hidden">
                {/* Step number */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-white/3 font-display select-none">
                  {step.step}
                </span>

                <div className="w-14 h-14 rounded-2xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Winners Section ──────────────────────────────────────────────────────────

function WinnersSection() {
  const { data: winners, isLoading } = usePublicWinners()

  if (isLoading || !winners?.length) return null

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-gold-400 text-sm font-medium mb-2">🏆 Últimos ganhadores</p>
            <h2 className="font-display font-bold text-white text-3xl sm:text-4xl">
              Quem está ganhando
            </h2>
          </div>
          <Link
            to="/ganhadores"
            className="hidden sm:flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
          >
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {winners.map((winner, i) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card variant="prize" padding="md" className="relative overflow-hidden">
                <div className="absolute inset-0 shine-effect opacity-30" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/20 flex items-center justify-center">
                      <Award size={18} className="text-gold-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{maskName(winner.display_name)}</p>
                      <p className="text-slate-500 text-xs">
                        {winner.display_ticket ? `Bilhete ${winner.display_ticket}` : 'Sorteio'}
                      </p>
                    </div>
                  </div>
                  <p className="text-gold-400 font-medium text-sm line-clamp-1">
                    🎁 {(winner as any).prize?.name || 'Prêmio'}
                  </p>
                  <p className="text-slate-500 text-xs mt-1 truncate">
                    {(winner as any).campaign?.name}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Trust Section ────────────────────────────────────────────────────────────

function TrustSection() {
  const features = [
    {
      icon: <Shield size={24} className="text-brand-400" />,
      title: 'Resultados no backend',
      description: 'Todo resultado de bilhete, box e roleta é calculado e validado no servidor. Nunca no navegador.',
    },
    {
      icon: <CheckCircle size={24} className="text-emerald-400" />,
      title: 'Hash criptográfico',
      description: 'Antes de cada campanha, geramos um SHA-256 público do sorteio. Qualquer pessoa pode verificar.',
    },
    {
      icon: <Zap size={24} className="text-gold-400" />,
      title: 'Logs de auditoria',
      description: 'Cada ação sensível é registrada com data, hora e responsável. Histórico imutável.',
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-surface-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-brand-400 text-sm font-medium mb-2">🔒 Confiança e transparência</p>
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3">
            Segurança que você pode verificar
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Nossa plataforma foi construída com auditabilidade como prioridade. Você nunca precisa confiar cegamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card variant="glass" className="h-full">
                <div className="w-12 h-12 rounded-xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white text-base mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/transparencia">
            <Button variant="outline" size="lg" leftIcon={<Shield size={18} />}>
              Ver página de transparência
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'Como sei que o resultado é justo?',
    a: 'Todo resultado é calculado no servidor e registrado em logs de auditoria. Para campanhas com prêmios instantâneos, o resultado é pré-determinado e seu hash SHA-256 é publicado antes do início.',
  },
  {
    q: 'Quando recebo meus bilhetes?',
    a: 'Seus bilhetes são liberados automaticamente assim que seu pagamento é confirmado. Em pagamentos PIX, a confirmação ocorre em poucos minutos.',
  },
  {
    q: 'Posso revelar meus bilhetes depois?',
    a: 'Sim! Seus bilhetes ficam na sua carteira até você decidir revelá-los, desde que dentro do prazo da campanha.',
  },
  {
    q: 'Como funciona o Box da Sorte?',
    a: 'Boxes disponíveis aparecem na sua carteira. Ao clicar em abrir, o servidor processa o resultado e só então a animação é executada. O resultado é definitivo e registrado.',
  },
  {
    q: 'Como recebo meu prêmio?',
    a: 'Após ganhar, o prêmio aparece em "Meus Prêmios". Nossa equipe entrará em contato pelo e-mail ou telefone cadastrado para combinar a entrega.',
  },
]

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3">
            Perguntas frequentes
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="glass rounded-2xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="font-medium text-white text-sm sm:text-base pr-4">{faq.q}</span>
                <ChevronRight
                  size={18}
                  className={`text-slate-400 shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-90' : ''
                  }`}
                />
              </button>
              <motion.div
                initial={false}
                animate={{ height: openIndex === i ? 'auto' : 0 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden bg-surface-900 border border-surface-700 p-8 sm:p-14 text-center shadow-2xl"
        >
          {/* Decorative Glows */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl mix-blend-screen" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-gold-500/20 blur-3xl mix-blend-screen" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-800 border border-surface-700 mb-6">
              <span className="text-xl">🎯</span>
              <span className="text-slate-300 text-sm font-medium tracking-wide uppercase">Sua hora chegou</span>
            </div>
            
            <h2 className="font-display font-bold text-white text-3xl sm:text-5xl mb-6">
              Sua chance começa <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-amber-200">aqui</span>
            </h2>
            
            <p className="text-slate-400 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Junte-se a milhares de participantes e concorra a prêmios incríveis com total transparência e entrega garantida.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cadastro">
                <Button variant="gold" size="xl" className="w-full sm:w-auto h-14 px-8 text-base shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  Criar conta grátis
                </Button>
              </Link>
              <Link to="/boxes">
                <Button
                  size="xl"
                  className="w-full sm:w-auto h-14 px-8 text-base bg-surface-800 hover:bg-surface-700 text-white border border-surface-600 hover:border-surface-500 transition-all"
                >
                  Ver sorteios
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <HeroSection />
      <MinigamesSection />
      <CampaignsSection />
      <BoxesSection />

      <HowItWorksSection />
      <WinnersSection />
      <TrustSection />
      <FAQSection />
      <CTASection />
    </>
  )
}
