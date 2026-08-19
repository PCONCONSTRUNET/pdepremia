import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Coins, Users, Clock, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { DoubleHistoryModal } from '@/components/double/DoubleHistoryModal'
import { ProvablyFairModal } from '@/components/double/ProvablyFairModal'
import { useAuthStore } from '@/store/authStore'

type ColorType = 'red' | 'white' | 'black'

type BetType = {
  id: string
  user: string
  amount: number
  color: ColorType
  avatar: string
}

export default function Double() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Game State
  const [status, setStatus] = useState<'idle' | 'spinning' | 'finished'>('idle')
  const [timeLeft, setTimeLeft] = useState(10)
  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [betAmount, setBetAmount] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<ColorType | null>(null)
  const [activeBets, setActiveBets] = useState<{ amount: number, color: ColorType, user: string, avatar: string, finalAmount?: number }[]>([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [spinDuration, setSpinDuration] = useState(4800)
  
  // Roulette State
  const DOUBLE_SEQUENCE = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8]
  
  const getMockTimestamp = (minutesAgo: number) => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - minutesAgo)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
  }

  const [history, setHistory] = useState<{color: ColorType, number: number | string, timestamp: string}[]>([
    {color: 'red', number: 1, timestamp: getMockTimestamp(14)}, {color: 'black', number: 14, timestamp: getMockTimestamp(13)}, {color: 'white', number: 'W', timestamp: getMockTimestamp(12)}, 
    {color: 'red', number: 3, timestamp: getMockTimestamp(11)}, {color: 'black', number: 12, timestamp: getMockTimestamp(10)}, {color: 'black', number: 11, timestamp: getMockTimestamp(9)}, 
    {color: 'red', number: 5, timestamp: getMockTimestamp(8)}, {color: 'red', number: 7, timestamp: getMockTimestamp(7)}, {color: 'black', number: 8, timestamp: getMockTimestamp(6)}, 
    {color: 'white', number: 'W', timestamp: getMockTimestamp(5)}, {color: 'black', number: 10, timestamp: getMockTimestamp(4)}, {color: 'red', number: 2, timestamp: getMockTimestamp(3)}, 
    {color: 'black', number: 13, timestamp: getMockTimestamp(2)}, {color: 'black', number: 9, timestamp: getMockTimestamp(1)}
  ])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<{color: ColorType, number: number | string, timestamp: string, hash?: string, roundId?: number} | null>(null)
  const [rouletteItems, setRouletteItems] = useState<{color: ColorType, number: string}[]>([])
  const [currentIndex, setCurrentIndex] = useState(15) // Reset inicial

  useEffect(() => {
    const items: {color: ColorType, number: string}[] = []
    // Repetir a sequência 30 vezes para ter fita suficiente para spins longos (450 itens)
    for(let i=0; i<30; i++) {
      DOUBLE_SEQUENCE.forEach(num => {
        let color: ColorType = 'white'
        if (num > 0 && num <= 7) color = 'red'
        if (num >= 8 && num <= 14) color = 'black'
        
        items.push({
          color,
          number: num === 0 ? 'W' : String(num)
        })
      })
    }
    setRouletteItems(items)
  }, [])
  
  // Handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permite números, pontos e vírgulas
    const value = e.target.value.replace(/[^0-9.,]/g, '')
    setBetAmount(value)
  }

  // Helper para converter string de aposta (ex: "6.000,00" ou "6000") para número
  const parseBetAmount = (val: string) => {
    if (!val) return 0
    // Se tiver vírgula, assume formato BR: remove pontos e troca vírgula por ponto
    if (val.includes(',')) {
      const clean = val.replace(/\./g, '').replace(',', '.')
      return parseFloat(clean) || 0
    }
    // Caso contrário (ex: 6000 ou 6000.50), apenas faz o parse
    return parseFloat(val) || 0
  }

  const handleHalf = () => {
    const num = parseBetAmount(betAmount)
    setBetAmount((num / 2).toString())
  }

  const handleDouble = () => {
    const num = parseBetAmount(betAmount)
    setBetAmount((num * 2).toString())
  }

  // Server Time Sync & URL Params check
  useEffect(() => {
    const syncTime = async () => {
      const clientTimeBefore = Date.now()
      const { data, error } = await (supabase as any).rpc('get_server_time')
      if (!error && data) {
        const clientTimeAfter = Date.now()
        const latency = (clientTimeAfter - clientTimeBefore) / 2
        const serverTimeMs = (data as number) * 1000
        const offset = serverTimeMs - (clientTimeBefore + latency)
        setTimeOffset(offset)
        console.log(`⏱️ Relógio sincronizado com o servidor. Offset: ${offset}ms`)
      }
    }
    syncTime()

    // Check if we need to open a specific round's Provably Fair info
    const roundIdParam = searchParams.get('roundId')
    if (roundIdParam) {
      const fetchRound = async () => {
        try {
          const { data, error } = await (supabase as any).rpc('get_double_round_info', { p_round_id: parseInt(roundIdParam) })
          if (!error && data) {
            setSelectedHistoryItem({
              color: (data as any).result_color,
              number: (data as any).result_number === 0 ? 'W' : (data as any).result_number,
              timestamp: (data as any).timestamp,
              hash: (data as any).hmac_hash,
              roundId: (data as any).round_id
            })
          }
        } catch (e) {
          console.error('Error fetching round info:', e)
        }
        // Remove param from URL so it doesn't reopen on refresh
        setSearchParams({})
      }
      fetchRound()
    }
  }, [])

  // Global Timer Loop
  // Backend: 15s cycle, bets open for first 10s (phase 0–9), spin at phase 10–14
  const ROUND_DURATION = 15  // must match backend: floor(now / 15)
  const BET_OPEN_SECS  = 10  // must match backend: v_phase_time >= 10 → reject
  const roundIdRef = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = (Date.now() + timeOffset) / 1000
      const currentRoundId = Math.floor(now / ROUND_DURATION)
      const phaseTime = Math.floor(now) % ROUND_DURATION

      // New Round Reset
      if (currentRoundId !== roundIdRef.current) {
        roundIdRef.current = currentRoundId
        setStatus('idle')
        setActiveBets([])
        setCurrentIndex(22) // Reset wheel visually para o branco ('W')
      }

      if (phaseTime < BET_OPEN_SECS) {
        // Betting phase: show countdown of remaining bet time
        if (status === 'finished') setStatus('idle')
        setTimeLeft(BET_OPEN_SECS - phaseTime)
      } else if (phaseTime >= BET_OPEN_SECS && status === 'idle') {
        // Spin phase (last 5 seconds)
        setTimeLeft(0)
        handleSpin(currentRoundId)
      }
    }, 250)

    return () => clearInterval(timer)
  }, [status, currentIndex, rouletteItems, timeOffset, activeBets])

  const handlePlaceBet = async () => {
    if (!profile) {
      toast.error('Faça login para apostar!')
      return
    }
    if (!selectedColor) {
      toast.error('Selecione uma cor para apostar!')
      return
    }

    const amount = parseBetAmount(betAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Insira uma quantia válida!')
      return
    }
    
    const currentBalance = Number(profile.balance || 0)
    if (currentBalance < amount) {
      toast.error('Saldo insuficiente!')
      return
    }
    if (activeBets.some(b => b.color === selectedColor)) {
      toast.error('Você já apostou nesta cor!')
      return
    }

    const toastId = toast.loading('Processando aposta...')

    try {
      const { data, error } = await (supabase as any).rpc('place_double_bet', {
        p_bet_amount: amount,
        p_target_color: selectedColor
      })

      if (error) throw error

      setActiveBets(prev => [...prev, {
        amount,
        color: selectedColor,
        user: profile.full_name || 'Jogador',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`
      }])
      
      // Atualização visual instantânea do saldo deduzido
      const newBalance = currentBalance - amount
      useAuthStore.getState().setProfile({ ...profile, balance: newBalance })
      
      toast.success('Aposta confirmada! Sorteio em breve.', { id: toastId })
    } catch (error: any) {
      console.error('Erro ao processar aposta:', error)
      toast.error('Sua aposta falhou: ' + error.message, { id: toastId })
    }
  }

  const handleSpin = async (targetRoundId: number) => {
    setStatus('spinning')
    let resultColor: ColorType = 'white'
    let resultNumber = 0
    let serverHash = ''
    let totalWon = 0
    let updatedBets = activeBets

    try {
      // Puxa o resultado criptográfico oficial da rodada
      const { data, error } = await (supabase as any).rpc('get_double_result', { p_round_id: targetRoundId })
      if (error) throw error

      resultColor = (data as any).result_color as ColorType
      resultNumber = (data as any).result_number
      serverHash = (data as any).hmac_hash
    } catch (e) {
      console.error("Erro ao buscar resultado global:", e)
      // Fallback em caso de falha de rede para não travar a roleta
      const rand = Math.floor(Math.random() * 15)
      resultNumber = rand
      resultColor = rand === 0 ? 'white' : rand <= 7 ? 'red' : 'black'
    }

    // Verifica se o usuário ativo ganhou em alguma das apostas
    if (activeBets.length > 0) {
      updatedBets = activeBets.map(bet => {
        const didWin = bet.color === resultColor
        const wonAmount = didWin ? bet.amount * (resultColor === 'white' ? 18 : 2) : 0
        totalWon += wonAmount
        return { ...bet, finalAmount: didWin ? wonAmount : 0 }
      })
    }

    // Calcula o tempo exato restante na rodada para a animação
    const nowAfterRpc = (Date.now() + timeOffset) / 1000
    const phaseTimeAfterRpc = nowAfterRpc % ROUND_DURATION
    // Dá 200ms de margem antes do reset
    const calculatedDuration = Math.max(1000, (ROUND_DURATION - phaseTimeAfterRpc) * 1000 - 200)
    setSpinDuration(calculatedDuration)

    // Escolher um índice alvo garantindo que seja o NÚMERO sorteado exato
    // Offset de ~75 itens = aprox. 5 voltas completas na roleta (conforme solicitado)
    const randomOffset = Math.floor(Math.random() * 15) + 75
    let targetIndex = currentIndex + randomOffset
    const targetString = resultNumber === 0 ? 'W' : String(resultNumber)
    while(rouletteItems[targetIndex] && rouletteItems[targetIndex].number !== targetString) {
      targetIndex++
    }
    setCurrentIndex(targetIndex)

    setTimeout(() => {
      // Verifica se a rodada já virou (para não ressuscitar estado velho)
      const checkNow = (Date.now() + timeOffset) / 1000
      const checkCurrentRound = Math.floor(checkNow / ROUND_DURATION)
      if (checkCurrentRound !== targetRoundId) return

      setStatus('finished')
      setHistory(prev => {
        const newHistory = [...prev, {color: resultColor, number: resultNumber === 0 ? 'W' : resultNumber, timestamp: getMockTimestamp(0), hash: serverHash}]
        if (newHistory.length > 100) return newHistory.slice(newHistory.length - 100) // Keep max 100 for modal
        return newHistory
      })
      
      if (activeBets.length > 0) {
        if (totalWon > 0) {
          const currentProfile = useAuthStore.getState().profile
          if (currentProfile) {
            const currentBal = Number(currentProfile.balance || 0)
            useAuthStore.getState().setProfile({ ...currentProfile, balance: currentBal + totalWon })
          }
        }
        
        // setActiveBets(updatedBets) // Não definimos aqui para evitar conflito com a limpeza do global loop
      }
      
      // O Reset total da mesa agora é feito automaticamente pelo Global Timer Loop quando entra a nova rodada
    }, calculatedDuration)
  }

  return (
    <div className="min-h-screen bg-surface-950 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* PAINEL DE APOSTAS (Esquerda) */}
          <div className="lg:col-span-3 bg-[#1A1F24] border border-surface-800 rounded-2xl p-5 flex flex-col shadow-xl">
            
            {/* Abas */}
            <div className="flex bg-[#0F1317] p-1 rounded-xl mb-6 border border-surface-800">
              <button className="flex-1 py-2 text-sm font-medium text-white bg-[#2B3139] rounded-lg shadow-sm border border-surface-700">
                Normal
              </button>
              <button className="flex-1 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Auto
              </button>
            </div>

            {/* Input Quantia */}
            <div className="mb-6">
              <label className="block text-slate-400 text-sm font-medium mb-2 px-1">Quantia</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-white font-medium">R$</span>
                <input
                  type="text"
                  value={betAmount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full bg-[#0F1317] border border-surface-800 rounded-xl py-4 pl-[45px] pr-24 text-white focus:outline-none focus:border-brand-500 font-medium text-left"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button onClick={handleHalf} className="px-3 py-2 bg-[#2B3139] hover:bg-surface-600 rounded-lg text-xs text-white font-medium transition-colors border border-surface-700">
                    ½
                  </button>
                  <button onClick={handleDouble} className="px-3 py-2 bg-[#2B3139] hover:bg-surface-600 rounded-lg text-xs text-white font-medium transition-colors border border-surface-700">
                    2x
                  </button>
                </div>
              </div>
            </div>

            {/* Selecionar Cor */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm font-medium mb-3">Selecionar Cor</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setSelectedColor('red')}
                  className={`py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all relative overflow-hidden ${
                    selectedColor === 'red' ? 'ring-2 ring-white shadow-[0_0_20px_rgba(241,44,76,0.3)]' : ''
                  } bg-[#F12C4C] hover:bg-[#F12C4C]/90 text-white`}
                >
                  <span className="text-sm">x2</span>
                </button>
                <button 
                  onClick={() => setSelectedColor('white')}
                  className={`py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
                    selectedColor === 'white' ? 'ring-2 ring-brand-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''
                  } bg-white hover:bg-gray-100 text-[#1E2329]`}
                >
                  <span className="text-sm text-[#F12C4C]">x18</span>
                </button>
                <button 
                  onClick={() => setSelectedColor('black')}
                  className={`py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
                    selectedColor === 'black' ? 'ring-2 ring-white shadow-[0_0_20px_rgba(0,0,0,0.5)]' : ''
                  } bg-[#2B3139] hover:bg-[#2B3139]/80 text-white border border-surface-700`}
                >
                  <span className="text-sm">x2</span>
                </button>
              </div>
            </div>

            {/* Botão Jogar */}
            <button
              onClick={handlePlaceBet}
              disabled={status !== 'idle' || !selectedColor || activeBets.some(b => b.color === selectedColor)}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all mt-auto ${
                status === 'idle' && (!selectedColor || !activeBets.some(b => b.color === selectedColor))
                  ? 'bg-[#F12C4C] hover:bg-[#d92241] shadow-lg shadow-[#F12C4C]/20' 
                  : 'bg-[#50242e] text-[#a45969] cursor-not-allowed'
              }`}
            >
              {status === 'idle' && (!selectedColor || !activeBets.some(b => b.color === selectedColor)) ? 'Fazer Aposta' : (selectedColor && activeBets.some(b => b.color === selectedColor)) ? 'Aposta Registrada' : 'Esperando...'}
            </button>
          </div>

          {/* ÁREA PRINCIPAL (Direita) */}
          <div className="lg:col-span-9 flex flex-col gap-6">
            
            {/* Box da Roleta */}
            <div className="bg-[#1A1F24] border border-surface-800 rounded-2xl p-6 flex flex-col relative overflow-hidden h-[340px] justify-center items-center shadow-xl">
              
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <p className="text-white font-medium text-lg tracking-wide">
                  {status === 'idle' ? 'Aguardando Aposta' : status === 'spinning' ? 'Girando...' : 'Resultado'}
                </p>
                {status === 'idle' && (
                  <div className="mt-2 bg-surface-800/80 px-4 py-1 rounded-full border border-surface-700">
                    <span className="text-brand-400 font-bold">{timeLeft}s</span>
                  </div>
                )}
              </div>

              {/* ROULETTE MOCK */}
              <div className="w-full overflow-hidden flex relative my-8 h-24 mask-image-linear">
                {/* Linha do meio */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-20 -translate-x-1/2 shadow-[0_0_15px_rgba(255,255,255,1)]"></div>
                
                {/* Roleta Animada */}
                <div className={`flex gap-4 absolute left-1/2 ${status !== 'idle' ? 'transition-transform' : 'transition-transform'}`} 
                     style={{ 
                       transform: `translateX(-${currentIndex * 112 + 48}px)`,
                       transitionDuration: status !== 'idle' ? `${spinDuration}ms` : '1000ms',
                       transitionTimingFunction: status !== 'idle' ? 'cubic-bezier(0.2, 0.6, 0.3, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)',
                       filter: status === 'spinning' ? 'blur(1px)' : 'blur(0)'
                     }}>
                  {rouletteItems.map((item, i) => {
                    const isWhite = item.color === 'white'
                    const isRed = item.color === 'red'
                    return (
                      <div key={i} className={`shrink-0 w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden ${isWhite ? 'bg-transparent' : (isRed ? 'bg-[#F12C4C] border-b-4 border-black/20' : 'bg-[#2B3139] border-b-4 border-black/20')}`}>
                        {isWhite ? (
                          <img src="/icone%20pedra%20branca.png" alt="W" className="w-full h-full object-cover scale-[1.18]" />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center font-bold text-lg border-white/90 text-white">
                            {item.number}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-[#0F1317] px-3 py-1.5 rounded-full border border-surface-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <span className="text-emerald-500 text-xs font-semibold tracking-wider">Online</span>
              </div>
            </div>

            {/* Giros Anteriores */}
            <div className="bg-[#1A1F24] border border-surface-800 rounded-2xl p-4 flex items-center shadow-lg">
              <span className="text-slate-500 text-xs font-semibold mr-4 whitespace-nowrap tracking-wider hidden sm:block">GIROS ANTERIORES</span>
              <div className="flex gap-2 flex-1 justify-end overflow-hidden">
                {history.slice(-15).map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setSelectedHistoryItem(item)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs hover:scale-110 transition-transform cursor-pointer overflow-hidden
                      ${item.color === 'red' ? 'bg-[#F12C4C] text-white' : item.color === 'white' ? 'bg-transparent' : 'bg-[#2B3139] border border-surface-700 text-white'}`}
                  >
                    {item.color === 'white' ? <img src="/icone%20pedra%20branca.png" alt="W" className="w-full h-full object-cover scale-[1.2]" /> : item.number}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="ml-4 p-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-slate-400 hover:text-white transition-colors"
              >
                <History size={16} />
              </button>
            </div>

          </div>
        </div>

        {/* Tabela de Apostas */}
        <div className="mt-6 bg-[#1A1F24] border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex border-b border-surface-800 bg-[#0F1317]">
            <button className="px-8 py-4 text-sm font-bold text-white border-b-2 border-[#F12C4C]">
              APOSTAS
            </button>
            <button className="px-8 py-4 text-sm font-medium text-slate-500 hover:text-white transition-colors">
              DESCRIÇÃO DO JOGO
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Coluna Vermelha */}
            <div className="bg-[#0F1317] rounded-xl p-5 border border-surface-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-medium text-lg">Vitória 2X</h3>
                <div className="w-10 h-10 bg-[#F12C4C] rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white/50"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-6">
                <span className="text-slate-500">Total apostas</span>
                <span className="text-white font-medium">
                  R$ {activeBets.filter(b => b.color === 'red').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                {activeBets.filter(b => b.color === 'red').map((bet, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#1A1F24] p-3 rounded-lg border border-surface-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-surface-700 rounded-full overflow-hidden">
                        <img src={bet.avatar} alt="Avatar" />
                      </div>
                      <span className="text-xs text-slate-400">{bet.user}</span>
                    </div>
                    <span className={`text-sm font-bold ${bet.finalAmount !== undefined ? (bet.finalAmount > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-slate-600 line-through') : 'text-white'}`}>
                      R$ {bet.finalAmount !== undefined ? bet.finalAmount.toFixed(2) : bet.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna Branca */}
            <div className="bg-[#0F1317] rounded-xl p-5 border border-surface-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-medium text-lg">Vitória 18X</h3>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/icone%20pedra%20branca.png" alt="W" className="w-full h-full object-cover scale-[1.18]" />
                </div>
              </div>
              <div className="flex justify-between text-sm mb-6">
                <span className="text-slate-500">Total apostas</span>
                <span className="text-white font-medium">
                  R$ {activeBets.filter(b => b.color === 'white').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                {activeBets.filter(b => b.color === 'white').map((bet, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#1A1F24] p-3 rounded-lg border border-brand-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-brand-500/20 rounded-full overflow-hidden">
                         <img src={bet.avatar} alt="Avatar" />
                      </div>
                      <span className="text-xs text-brand-300">{bet.user}</span>
                    </div>
                    <span className={`text-sm font-bold ${bet.finalAmount !== undefined ? (bet.finalAmount > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-slate-600 line-through') : 'text-white'}`}>
                      R$ {bet.finalAmount !== undefined ? bet.finalAmount.toFixed(2) : bet.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coluna Preta */}
            <div className="bg-[#0F1317] rounded-xl p-5 border border-surface-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-medium text-lg">Vitória 2X</h3>
                <div className="w-10 h-10 bg-[#2B3139] border border-surface-700 rounded-xl flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white/30"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-6">
                <span className="text-slate-500">Total apostas</span>
                <span className="text-white font-medium">
                  R$ {activeBets.filter(b => b.color === 'black').reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="space-y-2">
                {activeBets.filter(b => b.color === 'black').map((bet, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#1A1F24] p-3 rounded-lg border border-surface-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-surface-700 rounded-full overflow-hidden">
                        <img src={bet.avatar} alt="Avatar" />
                      </div>
                      <span className="text-xs text-slate-400">{bet.user}</span>
                    </div>
                    <span className={`text-sm font-bold ${bet.finalAmount !== undefined ? (bet.finalAmount > 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-slate-600 line-through') : 'text-white'}`}>
                      R$ {bet.finalAmount !== undefined ? bet.finalAmount.toFixed(2) : bet.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
          
          {/* Rodapé Provably Fair */}
          <div className="flex justify-center mt-8 pb-4">
            <button 
              onClick={() => toast('O sistema Provably Fair usa SHA-256 (Server Seed + Client Seed) baseando-se no horário mundial para garantir que todos os sorteios são matematicamente justos, transparentes e inalteráveis.', { icon: '🛡️', duration: 8000, style: { background: '#1A1F24', color: '#fff', border: '1px solid #2B3139' } })}
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-emerald-500 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              Sistema 100% Provably Fair
            </button>
          </div>
        </div>

        <DoubleHistoryModal 
          isOpen={isHistoryModalOpen} 
          onClose={() => setIsHistoryModalOpen(false)} 
          history={history} 
          onItemClick={setSelectedHistoryItem}
        />
        {/* Provably Fair Modal (Click in ball history) */}
        <ProvablyFairModal 
          isOpen={!!selectedHistoryItem}
          onClose={() => setSelectedHistoryItem(null)}
          item={selectedHistoryItem}
        />

      </div>
    </div>
  )
}
