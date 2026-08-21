import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, ChevronLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { SupportConversation, SupportMessage } from '@/types'
import { format } from 'date-fns'

export function LiveChatWidget() {
  const { user, profile, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [conversations, setConversations] = useState<SupportConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<SupportConversation | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, view])

  // Fetch all conversations for user
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const fetchChat = async () => {
      const { data: convs } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (convs && convs.length > 0) {
        setConversations(convs)
        
        // Find if there's an active one (not closed)
        const active = convs.find(c => c.status !== 'closed')
        if (active) {
          setActiveConversation(active)
          setView('chat')
          
          if (!isOpen) {
             const { count } = await supabase
               .from('support_messages')
               .select('*', { count: 'exact', head: true })
               .eq('conversation_id', active.id)
               .neq('sender_id', user.id)
               .eq('is_read', false)
             setUnreadCount(count || 0)
          }
        } else {
          // All closed, default to list view
          setView('list')
        }
      } else {
        setView('list')
      }
    }
    
    fetchChat()
    
    // Subscribe to conversation changes
    const convChannel = supabase
      .channel('public:support_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as SupportConversation
            setConversations(prev => [newConv, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as SupportConversation
            setConversations(prev => prev.map(c => c.id === updatedConv.id ? updatedConv : c))
            setActiveConversation(prev => prev?.id === updatedConv.id ? updatedConv : prev)
          } else if (payload.eventType === 'DELETE') {
            const deletedConv = payload.old as SupportConversation
            setConversations(prev => prev.filter(c => c.id !== deletedConv.id))
            setActiveConversation(prev => prev?.id === deletedConv.id ? null : prev)
            // se o chat ativo foi deletado, volta pra lista
            if (activeConversation?.id === deletedConv.id) {
              setView('list')
            }
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(convChannel)
    }
  }, [isAuthenticated, user, isOpen])

  // Fetch messages when activeConversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }
    
    const fetchMessages = async () => {
      const { data: msgs } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', activeConversation.id)
        .order('created_at', { ascending: true })
      
      if (msgs) {
        setMessages(msgs)
      }
    }
    
    fetchMessages()
    
    const msgChannel = supabase
      .channel(`messages:${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          setMessages((prev) => {
            if (!prev.find(m => m.id === newMsg.id)) {
              return [...prev, newMsg]
            }
            return prev
          })
          
          if (!isOpen && newMsg.sender_id !== user?.id) {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(msgChannel)
    }
  }, [activeConversation?.id, isOpen, user?.id])

  // Marcar como lido ao abrir
  useEffect(() => {
    if (isOpen && unreadCount > 0 && activeConversation && view === 'chat') {
      setUnreadCount(0)
      supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('conversation_id', activeConversation.id)
        .neq('sender_id', user?.id)
        .eq('is_read', false)
        .then()
    }
  }, [isOpen, view, activeConversation, unreadCount, user?.id])

  const startNewChat = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { data: newConv, error: convError } = await supabase
        .from('support_conversations')
        .insert({ user_id: user.id })
        .select()
        .single()
      
      if (convError) throw convError
      
      setActiveConversation(newConv)
      setView('chat')

      const initialMessage = 'Chamado aberto pelo cliente. Aguardando atendimento.'
      const msgId = crypto.randomUUID()
      const tempMsg: SupportMessage = {
        id: msgId,
        conversation_id: newConv.id,
        sender_id: user.id,
        is_admin: false,
        message: initialMessage,
        is_read: false,
        created_at: new Date().toISOString()
      }
      setMessages([tempMsg])

      await supabase
        .from('support_messages')
        .insert({
          id: msgId,
          conversation_id: newConv.id,
          sender_id: user.id,
          message: initialMessage
        })
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const openConversation = (conv: SupportConversation) => {
    setActiveConversation(conv)
    setView('chat')
  }

  const reopenConversation = async () => {
    if (!activeConversation || !user) return
    setIsLoading(true)
    try {
      await supabase.from('support_conversations').update({ status: 'open' }).eq('id', activeConversation.id)
      
      const msgId = crypto.randomUUID()
      const initialMessage = 'Cliente reabriu o chamado.'
      const tempMsg: SupportMessage = {
        id: msgId,
        conversation_id: activeConversation.id,
        sender_id: user.id,
        is_admin: false,
        message: initialMessage,
        is_read: false,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempMsg])
      
      await supabase.from('support_messages').insert({
        id: msgId,
        conversation_id: activeConversation.id,
        sender_id: user.id,
        message: initialMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !activeConversation) return

    setIsLoading(true)
    try {
      const msgId = crypto.randomUUID()
      const tempMsg: SupportMessage = {
        id: msgId,
        conversation_id: activeConversation.id,
        sender_id: user.id,
        is_admin: false,
        message: newMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempMsg])
      const msgToSend = newMessage.trim()
      setNewMessage('')

      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          id: msgId,
          conversation_id: activeConversation.id,
          sender_id: user.id,
          message: msgToSend
        })
      
      if (msgError) {
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        setNewMessage(msgToSend)
        throw msgError
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-all hover:-translate-y-1 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse border-2 border-surface-950">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Janela de Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-50 w-[320px] sm:w-[400px] h-[500px] bg-surface-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-brand-600 to-violet-600 text-white flex items-center justify-between shadow-md relative z-10">
              <div className="flex items-center gap-3">
                {view === 'chat' && (
                  <button onClick={() => setView('list')} className="mr-1 p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full border-2 border-brand-600 bg-surface-800 flex items-center justify-center overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" alt="Atendente" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-9 h-9 rounded-full border-2 border-brand-600 bg-surface-800 flex items-center justify-center overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ane&backgroundColor=ffdfbf" alt="Atendente" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight text-sm">Equipe de Suporte</h3>
                  <p className="text-[11px] text-white/90 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Respondemos na hora
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            {view === 'list' ? (
              <div className="flex-1 flex flex-col p-4 bg-surface-900 overflow-hidden">
                <button
                  onClick={startNewChat}
                  disabled={isLoading}
                  className="w-full mb-6 px-4 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Plus size={18} /> Iniciar novo chamado
                </button>
                
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Histórico de Chamados</h4>
                
                <div className="flex-1 overflow-y-auto space-y-2 pb-2 pr-1 custom-scrollbar">
                  {conversations.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 py-8 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center">
                        <MessageSquare size={20} className="text-slate-600" />
                      </div>
                      Nenhum chamado anterior.
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <button 
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-surface-800 hover:bg-surface-700 transition-all border border-white/5 text-left group hover:-translate-y-0.5"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-bold text-white">Chamado</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              conv.status === 'open' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              conv.status === 'waiting' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {conv.status === 'open' ? 'Aberto' : conv.status === 'waiting' ? 'Aguardando' : 'Encerrado'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">
                            {format(new Date(conv.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-surface-900 flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                          <ChevronLeft size={16} className="text-slate-500 group-hover:text-white rotate-180 transition-colors" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-surface-900">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <p className="text-sm text-slate-400">
                        Carregando mensagens...
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMine = msg.sender_id === user?.id
                      return (
                        <div key={msg.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl p-3 ${isMine ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-surface-800 text-slate-200 rounded-bl-sm border border-white/5 shadow-sm'}`}>
                            <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 font-medium">
                            {format(new Date(msg.created_at || new Date()), "HH:mm")}
                          </span>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeConversation && (
                  <div className="p-3 bg-surface-800/50 border-t border-white/5">
                    {activeConversation.status === 'closed' ? (
                      <div className="flex flex-col items-center py-2 gap-3">
                        <span className="text-sm text-slate-400 font-medium">Atendimento encerrado pelo suporte.</span>
                        <button 
                          onClick={reopenConversation}
                          disabled={isLoading}
                          className="px-4 py-2.5 bg-surface-700 hover:bg-surface-600 border border-white/10 text-white text-sm rounded-xl font-bold transition-all w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? 'Aguarde...' : (
                            <><MessageSquare size={16} /> Reabrir este chamado</>
                          )}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Escreva sua mensagem..."
                          className="flex-1 bg-surface-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 shadow-inner"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || isLoading}
                          className="p-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px] shadow-lg"
                        >
                          <Send size={18} />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
