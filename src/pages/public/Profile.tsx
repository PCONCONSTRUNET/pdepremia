import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Phone, Shield, ShieldCheck, LogOut, FileText, ShoppingBag, Clock, CheckCircle2, XCircle, Wallet, Save, ArrowUpRight, ArrowDownLeft, Gift, Ticket, X, Package, Camera, Trophy, Copy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { maskPhone, maskCPF, maskCNPJ, formatCurrency, generateWithdrawalId, copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, isFuture } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import MyPrizes from './MyPrizes'

export default function Profile() {
  const { profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'dados' | 'transacoes' | 'saque' | 'documentos'>('dados')
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
    } else if (paramsTab && ['dados', 'transacoes', 'saque', 'documentos'].includes(paramsTab)) {
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

  const handleTabChange = (tab: 'dados' | 'transacoes' | 'saque' | 'documentos') => {
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

        const allowedWalletTypes = ['admin_bonus', 'promo_code'] // removed 'withdrawal' since we use withdrawalsData
        const processedWT = (wtData || []).filter(tx => allowedWalletTypes.includes(tx.type))
        const processedPayments = (paymentsData || []).map(p => ({
          id: p.id,
          type: 'deposit',
          amount: p.amount,
          status: p.status,
          created_at: p.created_at
        }))
        
        const processedWithdrawals = (withdrawalsData || []).map(w => ({
          id: w.id,
          type: 'withdrawal',
          amount: w.amount,
          status: w.status,
          created_at: w.created_at
        }))

        const unifiedWallet = [...processedWT, ...processedPayments, ...processedWithdrawals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

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
      case 'approved':
      case 'confirmed':
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
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Meu Perfil</h1>
        <p className="text-slate-400">Consulte suas informações e transações.</p>
      </div>

      {/* Rank & XP Card */}
      <div className="mb-8 p-6 glass rounded-2xl border border-brand-500/20 bg-brand-500/5 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 shrink-0 bg-surface-800 rounded-2xl flex items-center justify-center p-3 border border-surface-700 shadow-xl">
             <img src={getRankRouletteIcon((profile as any)?.rank || 'P Starter')} alt="Rank" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h2 className="text-2xl font-bold text-white">{profile?.rank || 'P Starter'}</h2>
                <p className="text-brand-400 text-sm font-medium uppercase tracking-wider mt-0.5">Nível {(profile as any)?.rank_level || 1}</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-brand-400">{Math.floor((profile as any)?.xp || 0)}%</span>
                <span className="text-slate-400 text-sm ml-1 font-medium">concluído</span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-surface-900 rounded-full overflow-hidden border border-surface-700 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, (profile as any)?.xp || 0))}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full relative"
              />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Continue comprando bilhetes para encher a barra e subir de nível!
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-800 mb-8 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => handleTabChange('dados')}
          className={`pb-3 mr-8 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dados' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <User size={16} /> Dados Pessoais
          </div>
        </button>
        <button
          onClick={() => handleTabChange('transacoes')}
          className={`pb-3 mr-8 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'transacoes' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} /> Transações
          </div>
        </button>

        <button
          onClick={() => handleTabChange('documentos')}
          className={`pb-3 mr-8 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'documentos' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} /> Documentos
          </div>
        </button>
        <button
          onClick={() => handleTabChange('saque')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'saque' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet size={16} /> Saque
          </div>
        </button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-6">
          {activeTab === 'dados' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-white/5"
            >
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-brand-400" />
                Dados Pessoais
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                  <div className="p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200">
                    {profile?.full_name || 'N/A'}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">CPF</label>
                    <div className="p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 flex items-center gap-2">
                      <FileText size={16} className="text-slate-500" />
                      {profile?.cpf ? maskCPF(profile.cpf) : 'Não informado'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Telefone (WhatsApp)</label>
                    <div className="p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 flex items-center gap-2">
                      <Phone size={16} className="text-slate-500" />
                      {profile?.phone ? maskPhone(profile.phone) : 'Não informado'}
                    </div>
                  </div>
                </div>
                
              </div>
            </motion.div>
          ) : activeTab === 'saque' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-white/5"
            >
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Wallet size={20} className="text-brand-400" />
                Saque via PIX
              </h2>
              
              {!isEditingPix && pixKey ? (
                <div className="mt-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Chave PIX Cadastrada</h3>
                    <p className="text-slate-400 text-sm mb-4">Sua chave está configurada para receber seus prêmios.</p>
                    
                    <div className="bg-surface-900 rounded-lg py-2 px-6 border border-white/5 mb-6 inline-block">
                      <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                        {pixType === 'cpf' ? 'CPF' : pixType === 'email' ? 'E-mail' : pixType === 'phone' ? 'Celular' : 'CNPJ'}
                      </span>
                      <span className="text-white font-medium text-lg">{pixKey}</span>
                    </div>

                    <div className="mt-6 w-full max-w-sm mx-auto border-t border-white/5 pt-6">
                      {(kycStatus === 'approved' || kycStatus === 'none') ? (
                        <Button 
                          variant="primary" 
                          className="w-full" 
                          leftIcon={<ArrowUpRight size={18} />}
                          onClick={() => setShowWithdrawModal(true)}
                        >
                          Solicitar Saque
                        </Button>
                      ) : (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm text-center">
                          <Shield size={24} className="mx-auto mb-2 opacity-80" />
                          <p>Verificação de identidade necessária para saque.</p>
                          <Button 
                            variant="outline" 
                            className="w-full mt-3 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" 
                            onClick={() => handleTabChange('documentos')}
                          >
                            Ir para Documentos
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/5 pt-8">
                    <h3 className="text-lg font-bold text-white mb-4">Histórico de Saques</h3>
                    {withdrawals.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">Nenhum saque solicitado ainda.</p>
                    ) : (
                      <div className="space-y-3">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="bg-surface-900 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-white font-medium">Saque</span>
                                <div className="flex items-center gap-1 bg-surface-800 px-2 py-0.5 rounded text-xs font-mono text-slate-300">
                                  <span>{generateWithdrawalId(w.id, profile?.cpf, profile?.full_name)}</span>
                                  <button 
                                    onClick={() => {
                                      copyToClipboard(generateWithdrawalId(w.id, profile?.cpf, profile?.full_name))
                                      toast.success('ID copiado!')
                                    }}
                                    className="hover:text-white transition-colors p-0.5"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                                <span className="text-white font-medium ml-1">- {formatCurrency(w.amount)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>{format(new Date(w.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                <span>•</span>
                                <span className="uppercase">{w.pix_key}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {w.status === 'pending' && <span className="text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"><Clock size={12}/> Pendente</span>}
                              {w.status === 'approved' && <span className="text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"><CheckCircle2 size={12}/> Aprovado</span>}
                              {w.status === 'rejected' && <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded text-xs font-medium flex items-center gap-1"><XCircle size={12}/> Recusado</span>}
                              
                              {w.status === 'rejected' && w.admin_notes && (
                                <p className="text-xs text-red-400 max-w-xs text-right mt-1">Motivo: {w.admin_notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-400 mb-6">
                    Cadastre a sua chave PIX. Quando você for efetuar um saque dos seus prêmios, esta chave já será selecionada automaticamente.
                  </p>
                  
                  <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={hasSavedPix}
                    className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    disabled={hasSavedPix}
                    className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Chave PIX</label>
                    <select
                      value={pixType}
                      onChange={(e) => {
                        const newType = e.target.value
                        setPixType(newType)
                        let val = pixKey
                        if (newType === 'cpf') val = maskCPF(val)
                        else if (newType === 'cnpj') val = maskCNPJ(val)
                        else if (newType === 'phone') val = maskPhone(val)
                        setPixKey(val)
                      }}
                      disabled={hasSavedPix}
                      className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="phone">Celular</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => {
                        let val = e.target.value
                        if (pixType === 'cpf') val = maskCPF(val)
                        else if (pixType === 'cnpj') val = maskCNPJ(val)
                        else if (pixType === 'phone') val = maskPhone(val)
                        setPixKey(val)
                      }}
                      disabled={hasSavedPix}
                      className="w-full p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Sua chave PIX"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  {!hasSavedPix && (
                    <Button
                      variant="primary"
                      className="flex-1"
                      leftIcon={<Save size={18} />}
                      onClick={handleSavePix}
                      isLoading={savingPix}
                    >
                      Salvar Chave PIX
                    </Button>
                  )}
                  {hasSavedPix && (
                    <Button variant="ghost" className="flex-1" onClick={() => setIsEditingPix(false)}>
                      Voltar
                    </Button>
                  )}
                  {(!hasSavedPix && pixKey) && (
                    <Button variant="ghost" onClick={() => setIsEditingPix(false)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
              </>
            )}
            </motion.div>
          ) : activeTab === 'documentos' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-800 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center border border-brand-500/20">
                      <FileText className="text-brand-400" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Documentos (KYC)</h2>
                      <p className="text-sm text-slate-400">Verificação de Identidade para Liberação de Saques</p>
                    </div>
                  </div>
                  {kycStatus === 'approved' && (
                    <span className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <CheckCircle2 size={16} /> Aprovado
                    </span>
                  )}
                  {kycStatus === 'pending_review' && (
                    <span className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <Clock size={16} /> Em Análise
                    </span>
                  )}
                  {kycStatus === 'rejected' && (
                    <span className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <XCircle size={16} /> Reprovado
                    </span>
                  )}
                </div>

                <div className="max-w-xl">
                  {kycStatus === 'approved' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                      <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Identidade Verificada</h3>
                      <p className="text-slate-400">
                        Sua identidade foi verificada com sucesso! Você já pode solicitar saques na aba correspondente.
                      </p>
                    </div>
                  ) : kycStatus === 'none' ? (
                    <div className="bg-surface-900 border border-surface-700 rounded-xl p-8 text-center flex flex-col items-center">
                      <Shield size={48} className="text-slate-500 mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Tudo Certo por Enquanto</h3>
                      <p className="text-slate-400 max-w-md">
                        Você não precisa enviar nenhum documento no momento. Podemos pedir sua identidade em breve, mas por enquanto, continue aproveitando a plataforma!
                      </p>
                    </div>
                  ) : kycStatus === 'pending_review' ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
                      <Clock size={32} className="text-yellow-500 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-white mb-2">Documento em Análise</h3>
                      <p className="text-slate-400 text-sm">
                        Nossa equipe está avaliando sua documentação. O processo pode levar algumas horas. Enviaremos uma notificação assim que for concluído.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-surface-900 border border-surface-700 rounded-xl p-6">
                        {kycStatus === 'rejected' && (
                          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <XCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <div>
                              <p className="text-red-400 font-medium text-sm mb-1">Documento Reprovado</p>
                              <p className="text-red-400/80 text-xs">
                                Motivo: {kycRejectionReason || 'Documento ilegível ou inválido. Por favor, reenvie a foto seguindo as instruções.'}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {kycStatus === 'rejected_locked' ? (
                          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col items-center justify-center text-center">
                            <Shield className="text-red-400 mb-3" size={32} />
                            <p className="text-red-400 font-medium text-lg mb-2">Verificação Bloqueada</p>
                            <p className="text-red-400/80 text-sm">
                              Motivo: {kycRejectionReason || 'Fraude ou Violação dos Termos.'}
                            </p>
                            <p className="text-slate-400 text-sm mt-4">
                              Você não pode reenviar documentos. Entre em contato com o suporte para mais informações.
                            </p>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-white font-medium mb-2">Instruções para Envio</h3>
                            <ul className="text-sm text-slate-400 space-y-2 mb-6 list-disc pl-5">
                              <li>O documento deve ser RG ou CNH originais.</li>
                              <li>Certifique-se de que o ambiente esteja bem iluminado.</li>
                              <li>A selfie deve mostrar seu rosto claramente (sem óculos/chapéu).</li>
                            </ul>

                            <div className="space-y-4 mb-6">
                              {/* Frente */}
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">1. Frente do Documento</label>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setKycDocFront(e.target.files?.[0] || null)}
                                  disabled={isUploadingKyc}
                                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20"
                                />
                              </div>
                              
                              {/* Verso */}
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">2. Verso do Documento</label>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setKycDocBack(e.target.files?.[0] || null)}
                                  disabled={isUploadingKyc}
                                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20"
                                />
                              </div>

                              {/* Selfie */}
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">3. Selfie (Rosto)</label>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setKycSelfie(e.target.files?.[0] || null)}
                                  disabled={isUploadingKyc}
                                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-500/10 file:text-brand-400 hover:file:bg-brand-500/20"
                                />
                              </div>
                            </div>

                            <Button 
                              variant="primary" 
                              className="w-full" 
                              isLoading={isUploadingKyc} 
                              leftIcon={<Camera size={18} />}
                              onClick={handleKycSubmit}
                              disabled={!kycDocFront || !kycDocBack || !kycSelfie}
                            >
                              {isUploadingKyc ? 'Enviando documentos...' : 'Enviar Documentos para Análise'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'transacoes' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-white/5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag size={20} className="text-brand-400" />
                  Histórico
                </h2>
                
                <div className="flex bg-surface-900 rounded-lg p-1 border border-surface-700">
                  <button
                    onClick={() => setTransactionTab('compras')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      transactionTab === 'compras'
                        ? 'bg-surface-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compras
                  </button>
                  <button
                    onClick={() => setTransactionTab('carteira')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      transactionTab === 'carteira'
                        ? 'bg-surface-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Saques e Depósitos
                  </button>
                  <button
                    onClick={() => setTransactionTab('jogos')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      transactionTab === 'jogos'
                        ? 'bg-surface-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Jogos
                  </button>
                </div>
              </div>
              
              {transactionTab === 'compras' ? (
                loadingOrders ? (
                  <div className="text-center py-8 text-slate-400">Carregando compras...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-surface-900 rounded-xl border border-surface-700">
                    Você ainda não realizou nenhuma compra.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-surface-900 border border-surface-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium">
                              {order.box_id ? order.boxes?.name : order.campaigns?.name}
                            </h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-slate-400">
                            {format(new Date(order.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {order.box_id ? (
                              <>{order.quantity} box{order.quantity > 1 ? 'es' : ''}</>
                            ) : (
                              <>{order.quantity} bilhete{order.quantity > 1 ? 's' : ''}</>
                            )}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-lg font-bold text-emerald-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : transactionTab === 'carteira' ? (
                loadingWallet ? (
                  <div className="text-center py-8 text-slate-400">Carregando histórico da carteira...</div>
                ) : walletTransactions.filter(tx => !['bet', 'win'].includes(tx.type)).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-surface-900 rounded-xl border border-surface-700 flex flex-col items-center">
                    <Wallet size={32} className="text-slate-600 mb-3" />
                    Você ainda não possui saques ou depósitos registrados.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {walletTransactions.filter(tx => !['bet', 'win'].includes(tx.type)).map((tx) => (
                      <div key={tx.id} className="bg-surface-900 border border-surface-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' || tx.type === 'admin_bonus' || tx.type === 'promo_code' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-400'}`}>
                            {tx.type === 'deposit' || tx.type === 'admin_bonus' || tx.type === 'promo_code' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-white font-medium">{tx.type === 'deposit' ? 'Depósito' : tx.type === 'admin_bonus' ? 'Saldo Adicionado (Manual)' : tx.type === 'promo_code' ? 'Código Promocional' : 'Saque'}</h3>
                              {tx.type === 'withdrawal' && (
                                <div className="flex items-center gap-1 bg-surface-800 px-2 py-0.5 rounded text-xs font-mono text-slate-300">
                                  <span>{generateWithdrawalId(tx.id, profile?.cpf, profile?.full_name)}</span>
                                  <button 
                                    onClick={() => {
                                      copyToClipboard(generateWithdrawalId(tx.id, profile?.cpf, profile?.full_name))
                                      toast.success('ID copiado!')
                                    }}
                                    className="hover:text-white transition-colors p-0.5"
                                    title="Copiar ID"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              )}
                              {getStatusBadge(tx.status)}
                            </div>
                            <p className="text-sm text-slate-400">
                              {format(new Date(tx.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right pl-12 sm:pl-0">
                          <p className={`text-lg font-bold ${tx.type === 'deposit' || tx.type === 'admin_bonus' || tx.type === 'promo_code' ? 'text-emerald-400' : 'text-white'}`}>
                            {tx.type === 'deposit' || tx.type === 'admin_bonus' || tx.type === 'promo_code' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                loadingGames ? (
                  <div className="text-center py-8 text-slate-400">Carregando histórico de jogos...</div>
                ) : doubleBets.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-surface-900 rounded-xl border border-surface-700 flex flex-col items-center">
                    <Gift size={32} className="text-slate-600 mb-3" />
                    Você ainda não jogou.
                  </div>
                ) : (
                  <div className="w-full">
                    <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-[#0F1317] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 rounded-l-lg">DATA</th>
                          <th className="px-4 py-3">JOGO</th>
                          <th className="px-4 py-3">ID DA APOSTA</th>
                          <th className="px-4 py-3">QUANTIA</th>
                          <th className="px-4 py-3">MULT</th>
                          <th className="px-4 py-3">STATUS</th>
                          <th className="px-4 py-3">LUCRO</th>
                          <th className="px-4 py-3 text-right rounded-r-lg">AÇÃO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-800/50">
                        {doubleBets.map((bet) => {
                          const isWin = bet.status === 'won'
                          const mult = isWin ? (bet.color === 'white' ? 18 : 2) : 0
                          const profit = isWin ? bet.amount * mult : 0
                          
                          return (
                            <tr key={bet.id} className="hover:bg-surface-800/20 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap">
                                {format(new Date(bet.created_at), "yyyy-MM-dd HH:mm", { locale: ptBR })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-[#F12C4C] flex items-center justify-center font-bold text-[10px] text-white">D</div>
                                <span className="text-white">Double</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap font-mono text-xs">
                                {bet.id.substring(0, 8)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bet.amount)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {mult}x
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {bet.status === 'pending' ? 'Pendente' : isWin ? '1 Bet 1 Win' : '1 Bet 0 Win'}
                              </td>
                              <td className={`px-4 py-4 whitespace-nowrap font-medium ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isWin ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <Link 
                                  to={`/double?roundId=${bet.round_id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg text-slate-300 text-xs font-medium transition-colors"
                                >
                                  Justiça
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-6 mb-4 px-4">
                      <Button 
                        variant="outline" 
                        onClick={() => loadGamesPage(gamesPage - 1)} 
                        disabled={gamesPage === 1 || loadingMoreGames}
                        className="bg-surface-800 border-surface-700 text-slate-300 hover:text-white"
                      >
                        Página Anterior
                      </Button>
                      <span className="text-slate-400 text-sm">Página {gamesPage}</span>
                      <Button 
                        variant="outline" 
                        onClick={() => loadGamesPage(gamesPage + 1)} 
                        disabled={!hasMoreGames || loadingMoreGames}
                        className="bg-surface-800 border-surface-700 text-slate-300 hover:text-white"
                      >
                        Próxima Página
                      </Button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          ) : null}
        </div>
      </div>

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

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-2xl w-full max-w-md overflow-hidden border border-white/5 shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-900/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="text-brand-400" />
                Solicitar Saque
              </h3>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-surface-900 p-4 rounded-xl border border-surface-700 flex justify-between items-center">
                <span className="text-slate-400 text-sm">Saldo Disponível</span>
                <span className="text-emerald-400 font-bold text-xl">{formatCurrency((profile as any)?.balance || 0)}</span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Valor do Saque</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500">R$</span>
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0,00"
                    min="5"
                    step="5"
                    className="w-full pl-12 p-3 bg-surface-900 rounded-xl border border-surface-700 text-slate-200 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500">Valor mínimo de R$ 5,00.</p>
              </div>
              
              <div className="bg-brand-500/10 border border-brand-500/20 p-4 rounded-xl text-sm">
                <p className="text-brand-400 font-medium mb-1">Atenção</p>
                <p className="text-slate-400">O valor será enviado para a chave PIX <strong>{pixKey}</strong> cadastrada no seu perfil.</p>
              </div>

              <Button 
                variant="primary" 
                className="w-full" 
                onClick={handleWithdrawRequest}
                isLoading={isWithdrawing}
              >
                Confirmar Saque
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
