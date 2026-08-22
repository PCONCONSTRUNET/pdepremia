import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Phone, Shield, ShieldCheck, LogOut, FileText, ShoppingBag, Clock, CheckCircle2, XCircle, Wallet, Save, ArrowUpRight, ArrowDownLeft, Gift, Ticket, X, Package, Camera, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { maskPhone, maskCPF, maskCNPJ, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, isFuture } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import MyPrizes from './MyPrizes'

export default function Rewards() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'dados' | 'transacoes' | 'saque' | 'documentos' | 'recompensas' | 'premios'>('dados')
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [walletTransactions, setWalletTransactions] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [doubleBets, setDoubleBets] = useState<any[]>([])
  const [loadingGames, setLoadingGames] = useState(true)
  const [gamesPage, setGamesPage] = useState(1)
  const [hasMoreGames, setHasMoreGames] = useState(true)
  const [loadingMoreGames, setLoadingMoreGames] = useState(false)
  const GAMES_PER_PAGE = 20
  const [transactionTab, setTransactionTab] = useState<'compras' | 'carteira' | 'jogos'>('compras')
  const [availableBoxes, setAvailableBoxes] = useState<any[]>([])

  // Mock states for Recompensas UI
  const [isAvatarHovered, setIsAvatarHovered] = useState(false)
  
  const { data: userRewards, refetch: refetchRewards } = useQuery({
    queryKey: ['user_rewards', profile?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_rewards')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id
  })

  const { data: activeXpReward } = useQuery({
    queryKey: ['active_xp_reward', profile?.id],
    queryFn: async () => {
      const twoHoursAgo = new Date(Date.now() - 7200000).toISOString()
      const { data, error } = await (supabase as any)
        .from('user_rewards')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'claimed')
        .ilike('name', '%XP%')
        .gte('claimed_at', twoHoursAgo)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      return data || null
    },
    enabled: !!profile?.id
  })

  const [isXpActive, setIsXpActive] = useState(false)
  const [xpTimeLeft, setXpTimeLeft] = useState(7200) // 2 hours in seconds

  useEffect(() => {
    if (activeXpReward && activeXpReward.claimed_at) {
      const claimedDate = new Date(activeXpReward.claimed_at).getTime()
      const diff = Date.now() - claimedDate
      const remainingSeconds = Math.floor((7200000 - diff) / 1000)
      if (remainingSeconds > 0) {
        setIsXpActive(true)
        setXpTimeLeft(remainingSeconds)
      } else {
        setIsXpActive(false)
        setXpTimeLeft(0)
      }
    }
  }, [activeXpReward])

  const [isPromoOpen, setIsPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [loadingPromo, setLoadingPromo] = useState(false)
  const [dailyWheelCooldown, setDailyWheelCooldown] = useState<string>('')

  useEffect(() => {
    const interval = setInterval(() => {
      const savedCooldown = localStorage.getItem('@premios:dailyWheelCooldown')
      if (savedCooldown) {
        const parsedDate = new Date(savedCooldown)
        if (isFuture(parsedDate)) {
          const diff = parsedDate.getTime() - new Date().getTime()
          const h = Math.floor(diff / (1000 * 60 * 60))
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          const s = Math.floor((diff % (1000 * 60)) / 1000)
          setDailyWheelCooldown(`${h}h ${m}m ${s}s`)
        } else {
          localStorage.removeItem('@premios:dailyWheelCooldown')
          setDailyWheelCooldown('')
        }
      } else {
        setDailyWheelCooldown('')
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // PIX Form State
  const [pixType, setPixType] = useState('cpf')
  const [pixKey, setPixKey] = useState('')
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [savingPix, setSavingPix] = useState(false)
  const [isEditingPix, setIsEditingPix] = useState(false)

  const hasSavedPix = !!(profile as any)?.pix_key
  const kycStatus = (profile as any)?.kyc_status || 'none'
  const kycRejectionReason = (profile as any)?.kyc_rejection_reason || ''
  const [kycDocFront, setKycDocFront] = useState<File | null>(null)
  const [kycDocBack, setKycDocBack] = useState<File | null>(null)
  const [kycSelfie, setKycSelfie] = useState<File | null>(null)
  const [isUploadingKyc, setIsUploadingKyc] = useState(false)

  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  const handleKycSubmit = async () => {
    if (!kycDocFront || !kycDocBack || !kycSelfie || !profile) {
      toast.error('Selecione as 3 fotos antes de enviar.')
      return
    }

    setIsUploadingKyc(true)
    try {
      const uploadFile = async (file: File, type: string) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${profile.id}/kyc-${type}-${Date.now()}.${fileExt}`
        const { error } = await supabase.storage.from('kyc_documents').upload(fileName, file)
        if (error) throw error
        return fileName
      }

      const frontUrl = await uploadFile(kycDocFront, 'front')
      const backUrl = await uploadFile(kycDocBack, 'back')
      const selfieUrl = await uploadFile(kycSelfie, 'selfie')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending_review',
          kyc_doc_front_url: frontUrl,
          kyc_doc_back_url: backUrl,
          kyc_selfie_url: selfieUrl,
          kyc_document_url: frontUrl // fallback to avoid breaking old code
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      toast.success('Documentos enviados com sucesso! Estão em análise.')
      window.location.reload()
    } catch (error: any) {
      toast.error('Erro ao enviar documentos: ' + error.message)
    } finally {
      setIsUploadingKyc(false)
    }
  }

  const handleWithdrawRequest = async () => {
    const amount = parseFloat(withdrawAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valor inválido.')
      return
    }
    if (amount < 5) {
      toast.error('O valor mínimo de saque é R$ 5,00.')
      return
    }
    if (amount > ((profile as any)?.balance || 0)) {
      toast.error('Saldo insuficiente.')
      return
    }

    setIsWithdrawing(true)
    try {
      // Verifica tempo do último saque usando a nova tabela
      const { data: lastWithdrawal } = await supabase
        .from('withdrawals')
        .select('created_at')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastWithdrawal) {
        const lastWithdrawalDate = new Date(lastWithdrawal.created_at)
        const now = new Date()
        const diffInMinutes = (now.getTime() - lastWithdrawalDate.getTime()) / (1000 * 60)
        
        if (diffInMinutes < 5) {
          const minutesLeft = Math.ceil(5 - diffInMinutes)
          toast.error(`Aguarde ${minutesLeft} minuto(s) para solicitar outro saque.`)
          setIsWithdrawing(false)
          return
        }
      }

      const { error: txError } = await supabase.rpc('request_withdrawal', {
        p_amount: amount,
        p_pix_key: pixKey
      })
      if (txError) throw txError

      toast.success('Solicitação de saque enviada com sucesso! Aguarde a aprovação.')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar saque.')
    } finally {
      setIsWithdrawing(false)
    }
  }

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setCpf(maskCPF(profile.cpf || ''))
      
      const type = (profile as any).pix_key_type || 'cpf'
      let key = (profile as any).pix_key || ''
      if (type === 'cpf') key = maskCPF(key)
      else if (type === 'cnpj') key = maskCNPJ(key)
      else if (type === 'phone') key = maskPhone(key)

      setPixType(type)
      setPixKey(key)
    }
  }, [profile])

  useEffect(() => {
    const paramsTab = searchParams.get('tab')
    if (paramsTab === 'jogos') {
      setActiveTab('transacoes')
      setTransactionTab('jogos')
    } else if (paramsTab && ['dados', 'transacoes', 'saque', 'documentos', 'recompensas', 'premios'].includes(paramsTab)) {
      setActiveTab(paramsTab as any)
    }
  }, [searchParams])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (isXpActive && xpTimeLeft > 0) {
      timer = setInterval(() => {
        setXpTimeLeft((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isXpActive, xpTimeLeft])

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}h ${m}m ${s}s`
  }

  const handleTabChange = (tab: 'dados' | 'transacoes' | 'saque' | 'documentos' | 'recompensas' | 'premios') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim() || !profile) return
    setLoadingPromo(true)
    
    try {
      const { data, error } = await (supabase.rpc as any)('redeem_promo_code', {
        p_code: promoCode,
        p_user_id: profile.id
      })

      if (error) throw error

      if (data && (data as any).success) {
        toast.success((data as any).message || 'Código resgatado com sucesso!')
        setPromoCode('')
        setIsPromoOpen(false)
        
        // Handle visual update based on reward type
        if ((data as any).reward_type === 'balance') {
          // Se for saldo, atualizar a página é a forma mais segura de recarregar todos os componentes de carteira e perfil
          window.location.reload()
        } else if ((data as any).reward_type === 'xp_multiplier') {
          setIsXpActive(true)
          setXpTimeLeft((data as any).reward_duration || 7200)
        } else if ((data as any).reward_type === 'box') {
          // Buscar as boxes novamente para atualizar a tela na hora
          const res = await supabase
            .from('user_boxes')
            .select('*, box:boxes(*)')
            .eq('user_id', profile.id)
            .eq('status', 'available')
            .order('created_at', { ascending: false })
          if (res.data) setAvailableBoxes(res.data)
        }
      } else {
        toast.error((data as any)?.error || 'Erro ao resgatar código.')
      }
    } catch (err: any) {
      console.error('Erro ao resgatar promo code:', err)
      toast.error('Erro: ' + (err?.message || err?.details || 'Falha ao verificar código'))
    } finally {
      setLoadingPromo(false)
    }
  }

  const handleSavePix = async () => {
    if (!fullName || !cpf || !pixKey) {
      toast.error('Preencha todos os campos.')
      return
    }
    setSavingPix(true)
    try {
      const { error } = await (supabase as any).from('profiles').update({
        full_name: fullName,
        cpf: cpf,
        pix_key_type: pixType,
        pix_key: pixKey
      }).eq('id', profile!.id)

      if (error) throw error
      toast.success('Chave PIX salva com sucesso!')
      setIsEditingPix(false)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar chave PIX.')
    } finally {
      setSavingPix(false)
    }
  }

  useEffect(() => {
    if (profile?.id) {
      const fetchOrders = async () => {
        const { data } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            total_amount,
            status,
            quantity,
            box_id,
            campaigns (
              name
            ),
            boxes (
              name
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          
        const validOrders = (data || []).filter((o: any) => o.box_id || o.campaigns?.name || o.boxes?.name)
        setOrders(validOrders)
        setLoadingOrders(false)
      }

      const fetchWalletTransactions = async () => {
        const { data: wtData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
        
        const { data: withdrawalsData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', profile.id)
          
        const orderIds = ordersData?.map(o => o.id) || []
          
        let paymentsData: any[] = []
        if (orderIds.length > 0) {
          const { data } = await supabase
            .from('payments')
            .select('id, amount, status, created_at')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
          if (data) paymentsData = data
        }

        const allowedWalletTypes = ['withdrawal', 'admin_bonus', 'promo_code']
        const processedWT = (wtData || []).filter(tx => allowedWalletTypes.includes(tx.type))
        const processedPayments = (paymentsData || []).map(p => ({
          id: p.id,
          type: 'deposit',
          amount: p.amount,
          status: p.status,
          created_at: p.created_at
        }))

        const unifiedWallet = [...processedWT, ...processedPayments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        setWalletTransactions(unifiedWallet)
        setWithdrawals(withdrawalsData || [])
        setLoadingWallet(false)
      }

      const fetchUserBoxes = async () => {
        const { data } = await supabase
          .from('user_boxes')
          .select('*, box:boxes(*)')
          .eq('user_id', profile.id)
          .eq('status', 'available')
          .order('created_at', { ascending: false })
        setAvailableBoxes(data || [])
      }

      const fetchDoubleBets = async () => {
        const { data } = await (supabase as any)
          .from('double_bets')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(0, GAMES_PER_PAGE - 1)
        setDoubleBets(data || [])
        setHasMoreGames((data?.length || 0) === GAMES_PER_PAGE)
        setLoadingGames(false)
      }

      fetchOrders()
      fetchWalletTransactions()
      fetchUserBoxes()
      fetchDoubleBets()
    }
  }, [profile?.id])

  const loadGamesPage = async (page: number) => {
    if (!profile?.id || loadingMoreGames || page < 1) return
    setLoadingMoreGames(true)
    const from = (page - 1) * GAMES_PER_PAGE
    const to = from + GAMES_PER_PAGE - 1
    
    try {
      const { data, error } = await (supabase as any)
        .from('double_bets')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(from, to)
        
      if (error) throw error
      if (data) {
        setDoubleBets(data)
        setHasMoreGames(data.length === GAMES_PER_PAGE)
        setGamesPage(page)
      }
    } catch (error: any) {
      toast.error('Erro ao carregar mais jogos.')
    } finally {
      setLoadingMoreGames(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    if (!status || status === 'completed') return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 size={12} /> Concluído</span>
    switch (status) {
      case 'paid':
        return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 size={12} /> Aprovado</span>
      case 'pending':
      case 'awaiting_payment':
        return <span className="flex items-center gap-1 text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-xs font-medium"><Clock size={12} /> {status === 'pending' ? 'Pendente' : 'Aguardando'}</span>
      case 'cancelled':
      case 'rejected':
      case 'failed':
        return <span className="flex items-center gap-1 text-red-500 bg-red-500/15 px-2 py-1 rounded text-xs font-bold"><XCircle size={12} /> Rejeitado</span>
    }
  }

  const getRankRouletteIcon = (rank: string) => {
    switch (rank) {
      case 'P Hunter': return '/P HUNTER ROLETA.png'
      case 'P Master': return '/P Master ROLETA.png'
      case 'P Legend': return '/P Legend ROLETA.png'
      case 'P Starter':
      default: return '/ROLETA P STARTER.png'
    }
  }

  const groupedAvailableBoxes = availableBoxes?.reduce((acc: any, ubox: any) => {
    const boxId = ubox.box_definition_id;
    if (!acc[boxId]) {
      acc[boxId] = {
        boxId: boxId,
        box: ubox.box,
        items: []
      }
    }
    acc[boxId].items.push(ubox);
    return acc;
  }, {})

  const groupedAvailableBoxesArray = groupedAvailableBoxes ? Object.values(groupedAvailableBoxes) : []

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-6">
        <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl border border-white/5 overflow-hidden"
            >
              {/* Header Recompensas */}
              <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-white mb-1 flex items-center gap-2">
                    Minhas Recompensas
                  </h2>
                  <p className="text-slate-400 text-sm">Todas as suas recompensas guardadas em um só lugar! Não fica mais fácil do que isso.</p>
                </div>
                <button 
                  onClick={() => setIsPromoOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-surface-700 hover:border-brand-500/50 hover:text-white rounded-xl text-slate-300 text-sm font-medium transition-all group"
                >
                  <Ticket size={16} className="text-brand-400 group-hover:text-brand-300" />
                  Inserir código promocional
                </button>
              </div>

              {/* Minhas Boxes */}
              {availableBoxes.length > 0 && (
                <div className="p-6 border-b border-white/5 bg-surface-900/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                      <Package className="text-brand-400" size={24} />
                      Minhas Boxes Disponíveis
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedAvailableBoxesArray.map((group: any) => {
                      const count = group.items.length;
                      const firstBox = group.items[0];
                      return (
                      <motion.div 
                        whileHover={{ y: -4 }}
                        key={group.boxId} 
                        className="group relative bg-gradient-to-b from-surface-800 to-surface-900 border border-surface-700 hover:border-brand-500/50 rounded-3xl p-6 flex flex-col items-center text-center overflow-hidden transition-all duration-300 shadow-xl"
                      >
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-500/20 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {count > 1 && (
                          <div className="absolute top-4 right-4 bg-brand-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md shadow-lg z-20">
                            {count}x
                          </div>
                        )}

                        <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
                          {group.box?.image_url ? (
                            <img 
                              src={group.box.image_url} 
                              alt="Box" 
                              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="w-24 h-24 bg-surface-800 rounded-full flex items-center justify-center border border-surface-700 shadow-inner">
                              <Package size={48} className="text-brand-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="mb-6 relative z-10">
                          <h4 className="text-lg font-display font-bold text-white mb-1 group-hover:text-brand-400 transition-colors">
                            {group.box?.name || 'Box Misteriosa'}
                          </h4>
                          <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                            Pronta para abrir
                          </span>
                        </div>
                        
                        <Button 
                          variant="primary" 
                          className="w-full relative z-10 py-4 text-base shadow-lg shadow-brand-500/20"
                          onClick={() => window.location.href = `/abrir-box/${firstBox.id}`}
                        >
                          Abrir Agora
                        </Button>
                      </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-surface-700"></div>
                  </div>
                  <div className="relative bg-[#131829] px-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
                    Disponíveis
                  </div>
                </div>

                {/* Grid de Recompensas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Active Double Free Spins */}
                  {Number((profile as any)?.double_free_spins_count || 0) > 0 && (
                    <div 
                      onClick={() => { window.location.href = '/double' }}
                      className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden flex flex-col hover:border-brand-500/50 transition-colors sm:col-span-2 lg:col-span-1 min-h-[300px] justify-center items-center p-6 text-center cursor-pointer group"
                    >
                      <div className="w-24 h-24 mb-6 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                        {(() => {
                          const count = Number((profile as any)?.double_free_spins_count || 0);
                          let imgNum = '15';
                          if (count <= 2) imgNum = '2';
                          else if (count <= 5) imgNum = '5';
                          else if (count <= 10) imgNum = '10';
                          return (
                            <img 
                              src={`/${imgNum} rodadas gratis.png`}
                              alt="Giros Grátis"
                              className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform"
                            />
                          )
                        })()}
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Giros Grátis</h3>
                      <p className="text-slate-400 text-sm mb-4">Você tem {Number((profile as any)?.double_free_spins_count || 0)} giros disponíveis</p>
                      <div className="text-brand-400 font-bold text-sm bg-brand-500/10 px-4 py-2 rounded-lg border border-brand-500/20 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                        Jogar Double
                      </div>
                    </div>
                  )}
                  
                  {/* Active XP Box */}
                  {isXpActive && (
                    <div className="bg-gradient-to-br from-brand-900/40 to-surface-800 border border-brand-500/50 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_15px_rgba(99,102,241,0.15)] relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
                      <div className="p-5 flex gap-4 h-full">
                        <div className="w-16 h-16 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0 shadow-inner">
                          <ArrowUpRight size={28} className="text-brand-400" />
                        </div>
                        <div className="flex flex-col h-full">
                          <h3 className="text-white font-bold mb-1">XP Duplo Ativo</h3>
                          <p className="text-slate-400 text-xs leading-relaxed">
                            Você está ganhando o dobro de XP em todas as atividades. Aproveite!
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="px-5 py-3 border-t border-surface-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></div>
                            <span className="text-brand-400 font-medium text-xs uppercase tracking-wider">Ativo</span>
                          </div>
                          <span className="text-white font-mono font-bold">{formatCountdown(xpTimeLeft)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dynamic Rewards from DB */}
                  {userRewards?.map((reward: any) => (
                    <div key={reward.id} className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden flex flex-col hover:border-surface-600 transition-colors">
                      <div className="p-5 flex gap-4 h-full">
                        {reward.image_url ? (
                          <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                            <img 
                              src={reward.image_url} 
                              alt={reward.name} 
                              className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-110 transition-transform" 
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-surface-900 border border-surface-700 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                            <ArrowUpRight size={28} className="text-brand-400" />
                          </div>
                        )}
                        <div className="flex flex-col h-full">
                          <h3 className="text-white font-bold mb-1">{reward.name}</h3>
                          <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">
                            {reward.name.toLowerCase().includes('xp') 
                              ? 'Ative esta recompensa para subir de nível duas vezes mais rápido! A duração desta recompensa é de 2 horas.'
                              : reward.name.toLowerCase().includes('cashback')
                              ? 'O cashback corresponde a porcentagem das perdas líquidas, conforme a fórmula, e é aplicado apenas a apostas com dinheiro real.'
                              : `Recompensa obtida via ${reward.source === 'daily_wheel' ? 'Roleta Diária' : 'Plataforma'}.`}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <div className="px-5 py-3 border-t border-surface-700/50 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-slate-400 text-xs">{reward.category || 'Recompensa'}</span>
                        </div>
                        <div className="px-5 pb-5 pt-3 border-t border-surface-700/50">
                          <Button 
                            variant="primary" 
                            onClick={async () => {
                              try {
                                if (reward.name.toLowerCase().includes('xp')) {
                                  if (isXpActive) {
                                    toast.error('Você já possui um bônus de XP ativo. Aguarde expirar!')
                                    return
                                  }
                                  setIsXpActive(true)
                                  setXpTimeLeft(7200)
                                }
                                await (supabase as any).rpc('claim_user_reward', { p_reward_id: reward.id })
                                toast.success(`${reward.name} reivindicado com sucesso!`)
                                queryClient.invalidateQueries({ queryKey: ['active_xp_reward'] })
                                refetchRewards()
                              } catch (err) {
                                console.error(err)
                                toast.error('Erro ao reivindicar recompensa.')
                              }
                            }}
                            className="w-full !bg-[#f43f5e] hover:!bg-[#e11d48] border-none shadow-lg shadow-rose-500/20 font-bold py-3 text-sm"
                          >
                            Reivindicar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Card Roleta Ouro */}
                  <Link to="/roleta-diaria" className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden flex flex-col hover:border-amber-500/50 transition-colors sm:col-span-2 lg:col-span-1 min-h-[300px] justify-center items-center p-6 text-center cursor-pointer group">
                    <div className="w-24 h-24 mb-6 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                      <img 
                        src={getRankRouletteIcon((profile as any)?.rank || 'P Starter')} 
                        alt={`Roleta ${profile?.rank || 'P Starter'}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">Roleta De Prêmio {(profile as any)?.rank || 'P Starter'}</h3>
                    <p className="text-slate-400 text-xs mb-8">Prêmio Resgatável Diariamente</p>
                    {dailyWheelCooldown ? (
                      <div className="text-slate-500 text-xs font-medium bg-surface-900 px-4 py-2 rounded-lg border border-surface-700/50">
                        Disponível Em: <span className="text-slate-300">{dailyWheelCooldown}</span>
                      </div>
                    ) : (
                      <div className="text-amber-500 text-sm font-bold bg-amber-500/10 px-6 py-3 rounded-xl border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        Clique para Girar
                      </div>
                    )}
                  </Link>

                </div>
              </div>
            </motion.div>
      </div>
      <AnimatePresence>
        {/* Promo Code Modal */}
      {isPromoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface-800 rounded-2xl border border-surface-700 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Ticket className="text-brand-400" size={24} />
                Código Promocional
              </h3>
              <button 
                onClick={() => setIsPromoOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-400 text-sm mb-6">
                Tem um código de recompensa? Insira-o abaixo para receber giros grátis, cashback ou XP duplo na sua conta.
              </p>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Ex: PREMIA2024"
                    className="w-full bg-surface-900 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none transition-colors uppercase font-mono text-center tracking-widest"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => setIsPromoOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-1"
                    onClick={handleApplyPromoCode}
                    isLoading={loadingPromo}
                    disabled={!promoCode.trim()}
                  >
                    Resgatar
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  )
}
