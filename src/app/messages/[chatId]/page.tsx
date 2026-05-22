'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Mic,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Reply,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Message, Chat, Profile } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'
import { uploadMedia } from '@/lib/uploadMedia'
import { VoiceRecorder } from '@/components/chat/VoiceRecorder'
import Link from 'next/link'

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍']

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user } = useUserStore()
  const supabase = createClient()
  const router = useRouter()

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [hoverMessage, setHoverMessage] = useState<string | null>(null)
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ─── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !user) return

    fetchChat()
    fetchMessages()

    // Mark all incoming messages as read
    supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', user.id)
      .then(() => {})

    // Realtime — new messages
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(*), reply_message:reply_to(*, profiles(*))')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages((prev) => [...prev, data as Message])
          }
          setTimeout(() => scrollToBottom('smooth'), 100)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, user])

  // ─── Scroll ─────────────────────────────────────────────────────────────────
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // ─── Fetch chat metadata ─────────────────────────────────────────────────────
  const fetchChat = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*, chat_participants(*, profiles(*))')
      .eq('id', chatId)
      .single()
    if (data) {
      setChat(data as Chat)
      const other = (data as any).chat_participants?.find(
        (p: any) => p.user_id !== user?.id
      )
      setOtherUser(other?.profiles ?? null)
    }
  }

  // ─── Fetch all messages ──────────────────────────────────────────────────────
  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select(
        '*, profiles(*), reply_message:reply_to(*, profiles(*)), message_reactions(*)'
      )
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data as Message[])
    setLoading(false)
    setTimeout(() => scrollToBottom('auto'), 150)
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (mediaUrl?: string, mediaType?: string) => {
    if ((!input.trim() && !mediaUrl) || !user || sending) return
    setSending(true)

    const payload = {
      chat_id: chatId,
      sender_id: user.id,
      content: input.trim() || null,
      media_url: mediaUrl ?? null,
      media_type: mediaType ?? null,
      reply_to: replyTo?.id ?? null,
    }

    setInput('')
    setReplyTo(null)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await supabase.from('messages').insert(payload)
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId)

    setSending(false)
  }

  // ─── File upload ─────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const url = await uploadMedia(file, 'chat-media', user.id)
    if (url) {
      const type = file.type.startsWith('video') ? 'video' : 'image'
      await sendMessage(url, type)
    }
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleVoiceSend = async (blob: Blob) => {
    if (!user) return
    const file = new File([blob], 'voice.webm', { type: 'audio/webm' })
    const url = await uploadMedia(file, 'chat-media', user.id)
    if (url) {
      await sendMessage(url, 'voice')
    }
    setIsRecording(false)
  }

  // ─── Emoji reaction ──────────────────────────────────────────────────────────
  const handleReact = async (messageId: string, emoji: string) => {
    if (!user) return
    await supabase.from('message_reactions').upsert(
      { message_id: messageId, user_id: user.id, emoji },
      { onConflict: 'message_id,user_id' }
    )
    setShowEmojiFor(null)
    // Refresh reactions locally
    fetchMessages()
  }

  // ─── Auto-resize textarea ────────────────────────────────────────────────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
  }

  // ─── Group messages by date ──────────────────────────────────────────────────
  const groupedMessages = () => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    messages.forEach((msg) => {
      const date = new Date(msg.created_at).toDateString()
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    })
    return groups
  }

  const isOwn = (msg: Message) => msg.sender_id === user?.id

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-zinc-900/60 backdrop-blur-xl shrink-0">
        <button
          onClick={() => router.push('/messages')}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {otherUser ? (
          <Link
            href={`/profile/${otherUser.username}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                {otherUser.avatar_url ? (
                  <img
                    src={otherUser.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {otherUser.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-zinc-900 shadow" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                {otherUser.display_name}
              </p>
              <p className="text-green-400 text-xs">Online</p>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-600 text-sm">Loading messages…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-3">👋</div>
              <p className="text-zinc-400 font-semibold">Say hello!</p>
              <p className="text-zinc-600 text-sm mt-1">
                This is the beginning of your conversation
              </p>
            </div>
          </div>
        ) : (
          groupedMessages().map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[11px] text-zinc-600 bg-zinc-900 px-3 py-0.5 rounded-full border border-white/5">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {group.messages.map((msg) => {
                const own = isOwn(msg)
                const reactions = (msg as any).message_reactions ?? []
                const reactionMap = reactions.reduce(
                  (acc: Record<string, number>, r: any) => {
                    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
                    return acc
                  },
                  {}
                )
                const reactionEntries = Object.entries(reactionMap)

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 group mb-1 ${
                      own ? 'flex-row-reverse' : 'flex-row'
                    }`}
                    onMouseEnter={() => setHoverMessage(msg.id)}
                    onMouseLeave={() => {
                      setHoverMessage(null)
                      setShowEmojiFor(null)
                    }}
                  >
                    {/* Avatar for others */}
                    {!own && (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 self-end mb-1">
                        {msg.profiles?.avatar_url ? (
                          <img
                            src={msg.profiles.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                            {msg.profiles?.display_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`flex flex-col max-w-[70%] ${
                        own ? 'items-end' : 'items-start'
                      }`}
                    >
                      {/* Reply reference */}
                      {(msg as any).reply_message && (
                        <div
                          className={`text-xs mb-1 px-3 py-1.5 rounded-xl border-l-2 max-w-full ${
                            own
                              ? 'bg-blue-900/40 border-blue-400 text-blue-300'
                              : 'bg-zinc-800/60 border-zinc-500 text-zinc-400'
                          }`}
                        >
                          <span className="font-bold block">
                            {(msg as any).reply_message.profiles?.display_name}
                          </span>
                          <p className="truncate opacity-80">
                            {(msg as any).reply_message.content || '📎 Media'}
                          </p>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
                          own
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-zinc-800 text-white rounded-bl-md'
                        } ${msg.is_deleted ? 'opacity-40 italic' : ''}`}
                      >
                        {/* Media */}
                        {msg.media_url && (
                          <div className="mb-2 rounded-xl overflow-hidden">
                            {msg.media_type === 'voice' ? (
                              <audio
                                src={msg.media_url}
                                controls
                                className="max-w-xs w-full rounded-xl bg-zinc-900/60 border border-white/10 p-2"
                              />
                            ) : msg.media_type === 'video' ? (
                              <video
                                src={msg.media_url}
                                controls
                                className="max-w-xs w-full rounded-xl"
                              />
                            ) : (
                              <img
                                src={msg.media_url}
                                alt="attachment"
                                className="max-w-xs w-full rounded-xl object-cover"
                              />
                            )}
                          </div>
                        )}

                        {msg.is_deleted ? (
                          <p className="text-sm opacity-60">This message was deleted</p>
                        ) : (
                          msg.content && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )
                        )}

                        {/* Timestamp + read receipt */}
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            own ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span
                            className={`text-[10px] ${
                              own ? 'text-blue-100/60' : 'text-zinc-500'
                            }`}
                          >
                            {formatRelativeTime(msg.created_at)}
                          </span>
                          {own && (
                            msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-blue-200/50" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Emoji reactions */}
                      {reactionEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reactionEntries.map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReact(msg.id, emoji)}
                              className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 transition"
                            >
                              <span>{emoji}</span>
                              <span className="text-zinc-400">{count as number}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hover actions */}
                      <AnimatePresence>
                        {hoverMessage === msg.id && !msg.is_deleted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.12 }}
                            className={`flex items-center gap-0.5 mt-1 ${
                              own ? 'flex-row-reverse' : 'flex-row'
                            }`}
                          >
                            {/* Reply button */}
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition"
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>

                            {/* Emoji picker trigger */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setShowEmojiFor(
                                    showEmojiFor === msg.id ? null : msg.id
                                  )
                                }
                                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition text-sm leading-none"
                                title="React"
                              >
                                😊
                              </button>

                              <AnimatePresence>
                                {showEmojiFor === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 8 }}
                                    transition={{ duration: 0.15 }}
                                    className={`absolute ${
                                      own ? 'right-0' : 'left-0'
                                    } bottom-9 bg-zinc-900 border border-white/10 rounded-2xl p-2 flex gap-1 shadow-2xl z-30`}
                                  >
                                    {EMOJI_REACTIONS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReact(msg.id, emoji)}
                                        className="text-xl hover:scale-125 transition-transform p-1 rounded-xl hover:bg-white/10"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply Preview ───────────────────────────────────────────── */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="px-4 py-2.5 bg-zinc-900/80 border-t border-white/5 flex items-center gap-3 shrink-0"
          >
            <div className="flex-1 border-l-2 border-blue-500 pl-3 min-w-0">
              <p className="text-blue-400 text-xs font-bold">
                {replyTo.profiles?.display_name}
              </p>
              <p className="text-zinc-400 text-sm truncate">
                {replyTo.content || '📎 Media'}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-zinc-500 hover:text-white transition p-1 rounded-full hover:bg-white/10 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Bar ───────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/5 bg-zinc-900/60 backdrop-blur-xl shrink-0">
        {isRecording ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecording(false)}
          />
        ) : (
          <div className="flex items-end gap-2">
            {/* Attachment button */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFile}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2.5 text-zinc-500 hover:text-blue-400 transition shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Text input */}
            <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 focus-within:border-blue-500/50 transition flex items-end overflow-hidden">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Message…"
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder:text-zinc-600 outline-none resize-none"
                style={{ minHeight: '44px', maxHeight: '128px' }}
              />
              <button
                className="p-3 text-zinc-500 hover:text-blue-400 transition shrink-0"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {/* Send / Mic button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => (input.trim() ? sendMessage() : setIsRecording(true))}
              disabled={sending}
              className={`p-3 rounded-full transition shrink-0 ${
                input.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 cursor-pointer'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white cursor-pointer'
              }`}
            >
              {input.trim() ? (
                <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}
