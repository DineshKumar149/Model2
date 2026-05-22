'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Heart, MessageCircle, UserPlus, Repeat2, AtSign, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Notification } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'
import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  like: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  follow: { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/20' },
  repost: { icon: Repeat2, color: 'text-green-400', bg: 'bg-green-500/20' },
  mention: { icon: AtSign, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  message: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/20' },
}

const NOTIF_TEXT: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  repost: 'reposted your post',
  mention: 'mentioned you in a post',
  message: 'sent you a message',
}

export default function NotificationsPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const { notifications, setNotifications, markAllRead, markRead, addNotification } = useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'mentions'>('all')

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Real-time notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('notifications')
          .select('*, profiles!actor_id(*), posts(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) addNotification(data)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!actor_id(*), posts(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data)
    setLoading(false)
  }

  const handleMarkAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
    markAllRead()
  }

  const handleRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    markRead(id)
  }

  const filtered = tab === 'mentions'
    ? notifications.filter((n) => n.type === 'mention')
    : notifications

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white">Notifications</h1>
          </div>
          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-blue-400 text-sm font-medium hover:text-blue-300 transition"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        <div className="flex">
          {(['all', 'mentions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition relative ${
                tab === t ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t}
              {tab === t && (
                <motion.div
                  layoutId="notifTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-blue-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      {loading ? (
        Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-3 animate-pulse border-b border-white/5">
            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2.5 bg-white/10 rounded w-1/2" />
            </div>
          </div>
        ))
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <BellOff className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-white font-bold">No notifications yet</p>
          <p className="text-zinc-500 text-sm mt-1">When someone likes or follows you, it'll show up here.</p>
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map((notif, i) => {
            const config = NOTIF_ICONS[notif.type] || NOTIF_ICONS.like
            const Icon = config.icon
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !notif.is_read && handleRead(notif.id)}
                className={`flex items-start gap-3 p-4 border-b border-white/5 hover:bg-white/[0.02] transition cursor-pointer ${
                  !notif.is_read ? 'bg-blue-500/5' : ''
                }`}
              >
                {/* Avatar + icon */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                    {notif.profiles?.avatar_url ? (
                      <img src={notif.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                        {notif.profiles?.display_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-relaxed">
                    <Link href={`/profile/${notif.profiles?.username}`} className="font-bold text-white hover:underline">
                      {notif.profiles?.display_name}
                    </Link>
                    {notif.profiles?.is_verified && (
                      <BadgeCheck className="inline w-3.5 h-3.5 text-blue-400 fill-blue-400 mx-1" />
                    )}
                    <span className="text-zinc-300"> {NOTIF_TEXT[notif.type] || 'interacted with you'}</span>
                  </p>

                  {notif.posts?.content && (
                    <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{notif.posts.content}</p>
                  )}

                  <p className="text-zinc-600 text-xs mt-1">{formatRelativeTime(notif.created_at)}</p>
                </div>

                {/* Post thumbnail */}
                {notif.posts && notif.type !== 'follow' && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                    {(notif.posts as any).media_files?.[0]?.url ? (
                      <img
                        src={(notif.posts as any).media_files[0].url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-zinc-500 text-xs text-center px-1 leading-tight">
                          {notif.posts.content?.slice(0, 20)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Unread dot */}
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}
    </div>
  )
}
