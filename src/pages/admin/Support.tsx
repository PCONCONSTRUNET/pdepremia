import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Search, User, Shield, MessageSquare, Check, CheckCheck, X, Clock, CheckCircle2, CircleDot, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SupportConversation, SupportMessage, Profile } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { maskName, formatDateTime } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

type ConversationWithUser = SupportConversation & {
  profile: Pick<Profile, 'full_name' | 'email' | 'phone' | 'cpf' | 'created_at'>
}

export default function Support() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationWithUser[]>([])
  const [selectedConv, setSelectedConv] = useState<ConversationWithUser | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'waiting' | 'closed'>('open')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversations()
    
    // Subscribe to ALL new messages (to update unread counts or selected chat)
    const channel = supabase
      .channel('admin:support_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          
          // Update open chat
          setMessages((prev) => {
            // Selected chat check must use a functional approach or refs, 
            // since this callback scope might have stale selectedConv. 
            // But we can just use the state setter safely:
            return prev.length > 0 && prev[0].conversation_id === newMsg.conversation_id && !prev.find(m => m.id === newMsg.id)
              ? [...prev, newMsg] 
              : prev
          })
          
          // Trigger conversation list refresh (optimistic or full fetch)
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mark as read when selected
  useEffect(() => {
    if (selectedConv) {
      const fetchMsgs = async () => {
        const { data } = await supabase
          .from('support_messages')
          .select('*')
          .eq('conversation_id', selectedConv.id)
          .order('created_at', { ascending: true })
        
        if (data) setMessages(data)

        if (selectedConv.unread_count > 0) {
          // Clear unread
          await supabase
            .from('support_messages')
            .update({ is_read: true })
            .eq('conversation_id', selectedConv.id)
            .neq('sender_id', user?.id)
            .eq('is_read', false)
            
          await supabase
            .from('support_conversations')
            .update({ unread_count: 0 })
            .eq('id', selectedConv.id)
            
          fetchConversations()
        }
      }
      fetchMsgs()
    }
  }, [selectedConv, user?.id])

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('support_conversations')
      .select('*, profile:profiles!inner(full_name, email, phone, cpf, created_at)')
      .order('last_message_at', { ascending: false })
      
    if (data) {
      setConversations(data as ConversationWithUser[])
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !selectedConv) return

    setIsLoading(true)
    const text = newMessage.trim()
    setNewMessage('')
    
    // Optimistic
    const msgId = crypto.randomUUID()
    const tempMsg: SupportMessage = {
      id: msgId,
      conversation_id: selectedConv.id,
      sender_id: user.id,
      is_admin: true,
      message: text,
      is_read: false,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    const { error } = await supabase
      .from('support_messages')
      .insert({
        id: msgId,
        conversation_id: selectedConv.id,
        sender_id: user.id,
        is_admin: true,
        message: text
      })
      
    if (error) {
      console.error(error)
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      setNewMessage(text)
    }
    
    setIsLoading(false)
  }

  const updateStatus = async (status: 'open' | 'waiting' | 'closed') => {
    if (!selectedConv) return
    const { error } = await supabase
      .from('support_conversations')
      .update({ status })
      .eq('id', selectedConv.id)
    
    if (error) {
      toast.error('Erro ao atualizar status')
    } else {
      toast.success(status === 'closed' ? 'Atendimento encerrado' : status === 'waiting' ? 'Colocado em espera' : 'Atendimento reaberto')
      fetchConversations()
      setSelectedConv({ ...selectedConv, status })
    }
  }

  const deleteConversation = async () => {
    if (!selectedConv) return
    if (!confirm('Tem certeza que deseja excluir esta conversa? Isso apagará todo o histórico de mensagens.')) return

    const { error } = await supabase
      .from('support_conversations')
      .delete()
      .eq('id', selectedConv.id)

    if (error) {
      toast.error('Erro ao excluir conversa')
      console.error(error)
    } else {
      toast.success('Conversa excluída com sucesso')
      setSelectedConv(null)
      fetchConversations()
    }
  }

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const cStatus = c.status || 'open'
    const matchesStatus = statusFilter === 'all' || cStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatContact = (email: string | null | undefined) => {
    if (!email) return 'Sem contato'
    if (email.endsWith('@users.premiaja.com')) {
      const phone = email.replace('@users.premiaja.com', '')
      if (phone.length === 11) {
        return `(${phone.substring(0, 2)}) ${phone.substring(2, 7)}-${phone.substring(7, 11)}`
      }
      return phone
    }
    return email
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] lg:h-screen -m-4 sm:-m-6 lg:-m-8 overflow-hidden bg-surface-950">
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-80 border-r border-white/5 bg-surface-900/50 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <MessageSquare size={20} className="text-brand-400" /> Atendimento
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-1 min-w-[120px] ${statusFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-surface-800 text-slate-400 hover:bg-surface-700 hover:text-white'}`}>Todos</button>
            <button onClick={() => setStatusFilter('open')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-1 min-w-[120px] ${statusFilter === 'open' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800 text-slate-400 hover:bg-surface-700 hover:text-white'}`}><CircleDot size={12} /> Abertos</button>
            <button onClick={() => setStatusFilter('waiting')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-1 min-w-[120px] ${statusFilter === 'waiting' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-surface-800 text-slate-400 hover:bg-surface-700 hover:text-white'}`}><Clock size={12} /> Em Espera</button>
            <button onClick={() => setStatusFilter('closed')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 flex-1 min-w-[120px] ${statusFilter === 'closed' ? 'bg-surface-700 text-slate-300 border border-white/10' : 'bg-surface-800 text-slate-400 hover:bg-surface-700 hover:text-white'}`}><CheckCircle2 size={12} /> Encerrados</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-800 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-4 border-b border-white/5 transition-colors flex gap-3 ${
                  selectedConv?.id === conv.id ? 'bg-brand-500/10' : 'hover:bg-surface-800'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-slate-400 shrink-0 relative">
                  <User size={18} />
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-white text-sm truncate pr-2 mt-0.5">
                      {conv.profile.full_name || 'Sem nome'}
                    </span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {format(new Date(conv.last_message_at || new Date()), 'HH:mm')}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {conv.unread_count}
                        </span>
                      )}
                      {conv.status === 'waiting' && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Em espera
                        </span>
                      )}
                      {conv.status === 'closed' && (
                        <span className="bg-surface-700 text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Encerrado
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-slate-400'}`}>
                    {conv.last_message || 'Nova conversa'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main - Chat View */}
      <div className={`flex-1 flex flex-col bg-surface-950 ${!selectedConv && 'hidden md:flex'}`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 border-b border-white/5 bg-surface-900/50 flex items-center justify-between z-10 shadow-sm relative">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                  onClick={() => setSelectedConv(null)}
                >
                  <Search size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-slate-400">
                  <User size={18} />
                </div>
                <div className="cursor-pointer hover:bg-surface-800/50 p-1.5 -ml-1.5 rounded-lg transition-colors flex flex-col" onClick={() => setShowUserModal(true)}>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {selectedConv.profile.full_name || 'Sem nome'}
                    <span className="text-[9px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full font-medium">Ficha</span>
                  </h3>
                  <p className="text-xs text-slate-400">{formatContact(selectedConv.profile.email)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {(!selectedConv.status || selectedConv.status === 'open') && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updateStatus('waiting')} className="text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/10 h-8 text-xs hidden sm:flex" leftIcon={<Clock size={14} />}>
                      Pausar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatus('closed')} className="text-slate-300 border-white/10 hover:bg-surface-700 hover:text-white h-8 text-xs" leftIcon={<CheckCircle2 size={14} />}>
                      Encerrar
                    </Button>
                  </>
                )}
                {selectedConv.status === 'waiting' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => updateStatus('open')} className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 h-8 text-xs hidden sm:flex" leftIcon={<CircleDot size={14} />}>
                      Retomar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatus('closed')} className="text-slate-300 border-white/10 hover:bg-surface-700 hover:text-white h-8 text-xs" leftIcon={<CheckCircle2 size={14} />}>
                      Encerrar
                    </Button>
                  </>
                )}
                {selectedConv.status === 'closed' && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus('open')} className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 h-8 text-xs" leftIcon={<CircleDot size={14} />}>
                    Reabrir
                  </Button>
                )}
                
                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>
                <button 
                  onClick={deleteConversation}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir atendimento"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => {
                const isAdmin = msg.sender_id === user?.id || msg.is_admin
                return (
                  <div key={msg.id || i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 ${isAdmin ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-surface-800 text-slate-200 rounded-bl-sm border border-white/5'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(msg.created_at || new Date()), "HH:mm")}
                      </span>
                      {isAdmin && (
                        msg.is_read ? <CheckCheck size={12} className="text-brand-400" /> : <Check size={12} className="text-slate-500" />
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-surface-900/50 border-t border-white/5">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua resposta..."
                  className="flex-1 bg-surface-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500/50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isLoading}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>Enviar</span>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare size={48} className="mb-4 text-surface-800" />
            <p>Selecione uma conversa para começar o atendimento</p>
          </div>
        )}
      </div>
      {/* User Modal */}
      {showUserModal && selectedConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-white text-lg">Ficha do Cliente</h3>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white p-2 bg-surface-800 hover:bg-surface-700 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-3xl shadow-inner border border-brand-500/20">
                  {(selectedConv.profile.full_name || 'U').slice(0, 1).toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Nome</span>
                  <span className="text-sm font-medium text-white">{selectedConv.profile.full_name || 'Não informado'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Telefone</span>
                  <span className="text-sm font-medium text-white">{selectedConv.profile.phone || formatContact(selectedConv.profile.email)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">CPF</span>
                  <span className="text-sm font-medium text-white">{selectedConv.profile.cpf || 'Não informado'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-slate-400">Email Original</span>
                  <span className="text-sm font-medium text-slate-300">{selectedConv.profile.email?.endsWith('@users.premiaja.com') ? 'Criado por Telefone' : selectedConv.profile.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-400">Cadastro</span>
                  <span className="text-sm font-medium text-white">{formatDateTime(selectedConv.profile.created_at || '')}</span>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <Link to={`/admin/usuarios/${selectedConv.user_id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver Histórico Completo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
