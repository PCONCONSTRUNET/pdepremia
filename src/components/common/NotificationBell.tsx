import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, Trash2, Trophy, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Notification } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificationBell() {
  const { profile, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: notifications } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Notification[]
    },
    enabled: !!profile?.id && isAuthenticated,
    refetchInterval: 30000 // Refetch every 30s
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] })
    }
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAuthenticated) return null

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-surface-700/60 border border-surface-600/50 hover:border-brand-500/50 transition-all outline-none"
      >
        <Bell size={20} className="text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-800 border border-surface-600/50 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h3 className="font-bold text-white">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {!notifications || notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Bell className="mx-auto mb-2 opacity-50" size={24} />
                  Nenhuma notificação
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsReadMutation.mutate(notification.id)
                      }
                    }}
                    className={`p-3 rounded-lg flex gap-3 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-brand-500/10 hover:bg-brand-500/20' : 'hover:bg-surface-700'
                    }`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      notification.type === 'sorteio_winner' ? 'bg-gold-500/20 text-gold-400' : 'bg-brand-500/20 text-brand-400'
                    }`}>
                      {notification.type === 'sorteio_winner' ? <Trophy size={16} /> : <Info size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 break-words">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-brand-500 rounded-full mt-1 shrink-0"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
