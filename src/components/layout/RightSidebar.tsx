'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Hash, UserPlus, BadgeCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Profile, Hashtag } from '@/types'
import Link from 'next/link'

export function RightSidebar() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [trending, setTrending] = useState<Hashtag[]>([])
  const [suggested, setSuggested] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      const { data: tags } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(5)
      if (tags) setTrending(tags)

      const { data: people } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(5)
      if (people) setSuggested(people)
    }
    load()
  }, [user])

  const handleFollow = async (userId: string) => {
    if (!user) return
    const isF = following[userId]
    setFollowing((f) => ({ ...f, [userId]: !isF }))
    if (!isF) {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: userId })
    } else {
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: userId })
    }
  }

  return (
    <div className="space-y-6 sticky top-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search Nova..."
          readOnly
          onClick={() => window.location.href = '/explore'}
          className="w-full pl-4 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-zinc-500 text-sm cursor-pointer hover:bg-white/8 transition outline-none"
        />
      </div>

      {/* Trending */}
      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 pb-3">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-bold text-sm">Trending</h3>
        </div>
        <div className="divide-y divide-white/5">
          {trending.map((tag, i) => (
            <motion.button
              key={tag.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="w-full px-4 py-3 hover:bg-white/5 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white text-sm font-medium">{tag.name}</span>
              </div>
              <p className="text-zinc-600 text-xs mt-0.5 ml-5">{tag.post_count} posts</p>
            </motion.button>
          ))}
          {trending.length === 0 && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse space-y-1">
              <div className="h-3 bg-white/10 rounded w-24" />
              <div className="h-2.5 bg-white/10 rounded w-16" />
            </div>
          ))}
        </div>
        <Link href="/explore" className="block px-4 py-3 text-blue-400 text-sm hover:bg-white/5 transition">
          Show more →
        </Link>
      </div>

      {/* Who to follow */}
      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 pb-3">
          <UserPlus className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-bold text-sm">Who to follow</h3>
        </div>
        <div className="divide-y divide-white/5">
          {suggested.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
            >
              <Link href={`/profile/${u.username}`} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 shrink-0">
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">{u.display_name?.charAt(0)}</div>
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-white font-bold text-xs truncate">{u.display_name}</p>
                    {u.is_verified && <BadgeCheck className="w-3 h-3 text-blue-400 fill-blue-400 shrink-0" />}
                  </div>
                  <p className="text-zinc-500 text-xs truncate">@{u.username}</p>
                </div>
              </Link>
              {user?.id !== u.id && (
                <button
                  onClick={() => handleFollow(u.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition ${
                    following[u.id]
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {following[u.id] ? 'Following' : 'Follow'}
                </button>
              )}
            </motion.div>
          ))}
        </div>
        <Link href="/explore" className="block px-4 py-3 text-blue-400 text-sm hover:bg-white/5 transition">
          Show more →
        </Link>
      </div>

      {/* Footer */}
      <p className="text-zinc-700 text-xs px-2 leading-relaxed">
        Nova © 2026 · Privacy · Terms · Cookies
      </p>
    </div>
  )
}
