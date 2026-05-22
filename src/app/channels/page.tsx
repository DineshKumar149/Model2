'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Radio, Plus, Users, Lock, Globe, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Channel } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'
import Link from 'next/link'

export default function ChannelsPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [channels, setChannels] = useState<Channel[]>([])
  const [subscribed, setSubscribed] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchChannels()
  }, [user])

  const fetchChannels = async () => {
    const { data } = await supabase
      .from('channels')
      .select('*, profiles(*)')
      .eq('is_public', true)
      .order('subscriber_count', { ascending: false })
      .limit(30)
    if (data) setChannels(data)
    setLoading(false)
  }

  const handleSubscribe = async (channelId: string, isSubscribed: boolean) => {
    if (!user) return
    if (isSubscribed) {
      await supabase.from('channel_subscriptions').delete().match({ channel_id: channelId, user_id: user.id })
    } else {
      await supabase.from('channel_subscriptions').insert({ channel_id: channelId, user_id: user.id })
    }
    fetchChannels()
  }

  const handleCreate = async () => {
    if (!newName.trim() || !user) return
    setCreating(true)
    await supabase.from('channels').insert({
      name: newName,
      description: newDesc,
      owner_id: user.id,
      is_public: true,
    })
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
    fetchChannels()
    setCreating(false)
  }

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-black text-white">Channels</h1>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        )}
      </div>

      {/* Create channel form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="m-4 bg-zinc-900 rounded-2xl border border-white/10 p-4 space-y-3"
        >
          <h3 className="text-white font-bold">New Channel</h3>
          <input
            type="text"
            placeholder="Channel name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
          />
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="w-full py-3 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm disabled:opacity-50 transition"
          >
            {creating ? 'Creating...' : 'Create Channel'}
          </button>
        </motion.div>
      )}

      {/* Channels list */}
      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-zinc-900 rounded-2xl p-4 flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : channels.length === 0 ? (
          <div className="py-20 text-center">
            <Radio className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-white font-bold text-lg">No Channels Yet</p>
            <p className="text-zinc-500 text-sm mt-2">Be the first to create a channel!</p>
          </div>
        ) : (
          channels.map((channel, i) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 hover:bg-zinc-900 transition"
            >
              <div className="flex items-start gap-4">
                {/* Channel avatar */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0">
                  {channel.avatar_url ? (
                    <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-xl">{channel.name?.charAt(0)}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-sm">{channel.name}</h3>
                        {channel.is_public
                          ? <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          : <Lock className="w-3.5 h-3.5 text-zinc-500" />
                        }
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        by @{channel.profiles?.username} · {channel.subscriber_count} subscribers
                      </p>
                    </div>
                    <button
                      onClick={() => handleSubscribe(channel.id, channel.is_subscribed || false)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition ${
                        channel.is_subscribed
                          ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {channel.is_subscribed ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>

                  {channel.description && (
                    <p className="text-zinc-400 text-xs mt-2 line-clamp-2">{channel.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
