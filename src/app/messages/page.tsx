'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, MessageSquarePlus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Chat, Profile } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'
import Link from 'next/link'

export default function MessagesPage() {
  const { user, profile } = useUserStore()
  const supabase = createClient()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUsers, setSearchUsers] = useState<Profile[]>([])
  const [userQuery, setUserQuery] = useState('')

  useEffect(() => {
    if (!user) return
    fetchChats()
    const channel = supabase
      .channel('chat-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchChats)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchChats = async () => {
    if (!user) return
    const { data } = await supabase
      .from('chats')
      .select(`
        *,
        chat_participants(*, profiles(*)),
        messages(*, profiles(*), created_at)
      `)
      .order('updated_at', { ascending: false })
    if (data) {
      const enriched = data.map((chat: any) => ({
        ...chat,
        last_message: chat.messages?.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0],
      }))
      setChats(enriched)
    }
    setLoading(false)
  }

  const searchForUsers = async (query: string) => {
    if (!query.trim()) { setSearchUsers([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id)
      .ilike('username', `%${query}%`)
      .limit(10)
    if (data) setSearchUsers(data)
  }

  const startChat = async (otherUser: Profile) => {
    if (!user) return
    // Check if DM already exists between these two users
    const { data: existing } = await supabase
      .from('chats')
      .select('id, chat_participants!inner(user_id)')
      .eq('is_group', false)
      .eq('chat_participants.user_id', user.id)

    // Create new chat
    const { data: chat } = await supabase
      .from('chats')
      .insert({ is_group: false })
      .select()
      .single()

    if (chat) {
      await supabase.from('chat_participants').insert([
        { chat_id: chat.id, user_id: user.id },
        { chat_id: chat.id, user_id: otherUser.id },
      ])
      setShowNewChat(false)
      setUserQuery('')
      setSearchUsers([])
      router.push(`/messages/${chat.id}`)
    }
  }

  const getOtherParticipant = (chat: Chat) => {
    return chat.chat_participants?.find((p) => p.user_id !== user?.id)?.profiles
  }

  const filtered = chats.filter((c) => {
    if (!search) return true
    const other = getOtherParticipant(c)
    return (
      other?.username?.toLowerCase().includes(search.toLowerCase()) ||
      other?.display_name?.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Chat list sidebar */}
      <div className="w-full sm:w-80 border-r border-white/5 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-black text-white tracking-tight">Messages</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push('/messages/create-group')}
                className="p-2 rounded-full hover:bg-white/10 text-purple-400 transition"
                title="Create Group Chat"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className={`p-2 rounded-full transition ${
                  showNewChat
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-white/10 text-blue-400'
                }`}
                title="New Direct Message"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search existing chats */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 rounded-xl text-sm text-white placeholder:text-zinc-500 outline-none border border-white/10 focus:border-blue-500/50 transition"
            />
          </div>

          {/* New chat — search users */}
          {showNewChat && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <input
                type="text"
                placeholder="Search users to message..."
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value)
                  searchForUsers(e.target.value)
                }}
                className="w-full px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-white placeholder:text-blue-400/60 outline-none focus:border-blue-500/60 transition"
                autoFocus
              />
              {searchUsers.length > 0 && (
                <div className="mt-2 bg-zinc-900 rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                  {searchUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => startChat(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition text-left"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                            {u.display_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{u.display_name}</p>
                        <p className="text-zinc-500 text-xs">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3 animate-pulse border-b border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-white/10 rounded-full w-2/5" />
                  <div className="h-3 bg-white/10 rounded-full w-3/4" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <MessageSquarePlus className="w-10 h-10 text-zinc-700" />
              </div>
              <p className="text-zinc-400 font-semibold">No conversations yet</p>
              <p className="text-zinc-600 text-sm mt-1">Start messaging someone new</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-4 px-5 py-2 rounded-full bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-500/20"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            filtered.map((chat, i) => {
              const other = getOtherParticipant(chat)
              const lastMsg = (chat as any).last_message
              return (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <Link
                    href={`/messages/${chat.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-white/5 transition border-b border-white/5 group"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                        {chat.is_group ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        ) : other?.avatar_url ? (
                          <img
                            src={other.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                            {(chat.is_group ? chat.name : other?.display_name)
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Online indicator */}
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-zinc-950 shadow" />
                    </div>

                    {/* Chat info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-white font-semibold text-sm truncate">
                          {chat.is_group ? chat.name : other?.display_name}
                        </p>
                        <span className="text-zinc-600 text-[11px] shrink-0">
                          {lastMsg ? formatRelativeTime(lastMsg.created_at) : ''}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-xs truncate mt-0.5">
                        {lastMsg ? (
                          lastMsg.sender_id === user?.id
                            ? `You: ${lastMsg.content || '📎 Media'}`
                            : lastMsg.content || '📎 Media'
                        ) : (
                          <span className="italic">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — empty state shown on desktop */}
      <div className="hidden sm:flex flex-1 items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <MessageSquarePlus className="w-12 h-12 text-zinc-600" />
          </div>
          <p className="text-lg font-bold text-zinc-400">Select a conversation</p>
          <p className="text-sm mt-1 text-zinc-600 max-w-xs">
            Choose from your existing conversations, or click{' '}
            <span className="text-blue-400 font-medium">+</span> to start a new one
          </p>
        </div>
      </div>
    </div>
  )
}
