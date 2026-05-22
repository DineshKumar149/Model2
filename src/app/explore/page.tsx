'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, Users, Hash, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Hashtag, Post } from '@/types'
import Link from 'next/link'
import { PostCard } from '@/components/feed/PostCard'
import { BadgeCheck } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'

export default function ExplorePage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'top' | 'people' | 'hashtags' | 'media'>('top')
  const [users, setUsers] = useState<Profile[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [trending, setTrending] = useState<Hashtag[]>([])
  const [suggested, setSuggested] = useState<Profile[]>([])

  useEffect(() => {
    // Load trending hashtags and suggested users
    const loadTrending = async () => {
      const { data: tags } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(10)
      if (tags) setTrending(tags)

      const { data: people } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)
      if (people) setSuggested(people)
    }
    loadTrending()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setUsers([])
      setHashtags([])
      setPosts([])
      return
    }
    const timer = setTimeout(() => search(), 400)
    return () => clearTimeout(timer)
  }, [query, tab])

  const search = async () => {
    setLoading(true)
    if (tab === 'people' || tab === 'top') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20)
      if (data) setUsers(data)
    }
    if (tab === 'hashtags' || tab === 'top') {
      const { data } = await supabase
        .from('hashtags')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('post_count', { ascending: false })
        .limit(20)
      if (data) setHashtags(data)
    }
    if (tab === 'top' || tab === 'media') {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(*), media_files(*), post_reactions(count), comments(count)')
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setPosts(data.map((p: any) => ({
        ...p,
        reactions_count: p.post_reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
      })))
    }
    setLoading(false)
  }

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header + Search */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Nova..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white/5 border border-white/10 focus:border-blue-500/50 rounded-2xl text-white text-sm placeholder:text-zinc-500 outline-none transition"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {query && (
          <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide">
            {(['top', 'people', 'hashtags', 'media'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize whitespace-nowrap ${
                  tab === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!query ? (
        <div className="p-4 space-y-6">
          {/* Trending */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-bold text-lg">Trending</h2>
            </div>
            <div className="space-y-1">
              {trending.map((tag, i) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/explore/tags/${tag.name}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Hash className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium text-sm">#{tag.name}</p>
                        <p className="text-zinc-500 text-xs">{tag.post_count} posts</p>
                      </div>
                    </div>
                    <span className="text-zinc-700 group-hover:text-zinc-500 text-xs font-bold">#{i + 1}</span>
                  </Link>
                </motion.div>
              ))}
              {trending.length === 0 && (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-white/10 rounded w-24" />
                      <div className="h-2.5 bg-white/10 rounded w-16" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Suggested Users */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-white font-bold text-lg">Who to follow</h2>
            </div>
            <div className="space-y-2">
              {suggested.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SuggestedUserCard user={u} />
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Searching...</div>
          ) : (
            <>
              {/* Users */}
              {users.length > 0 && (tab === 'top' || tab === 'people') && (
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-white font-bold mb-3 text-sm">People</h3>
                  <div className="space-y-2">
                    {users.map((u) => <SuggestedUserCard key={u.id} user={u} />)}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {hashtags.length > 0 && (tab === 'top' || tab === 'hashtags') && (
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-white font-bold mb-3 text-sm">Hashtags</h3>
                  <div className="space-y-1">
                    {hashtags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/explore/tags/${tag.name}`}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
                      >
                        <Hash className="w-5 h-5 text-blue-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">#{tag.name}</p>
                          <p className="text-zinc-500 text-sm">{tag.post_count} posts</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {posts.length > 0 && (tab === 'top' || tab === 'media') && (
                <div>
                  <h3 className="text-white font-bold p-4 pb-2 text-sm">Posts</h3>
                  {posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              )}

              {users.length === 0 && hashtags.length === 0 && posts.length === 0 && (
                <div className="py-20 text-center">
                  <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-white font-bold">No results for "{query}"</p>
                  <p className="text-zinc-500 text-sm mt-1">Try searching for something else</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SuggestedUserCard({ user }: { user: Profile }) {
  const { user: me } = useUserStore()
  const supabase = createClient()
  const [following, setFollowing] = useState(false)

  const handleFollow = async () => {
    if (!me) return
    const newF = !following
    setFollowing(newF)
    if (newF) {
      await supabase.from('followers').insert({ follower_id: me.id, following_id: user.id })
    } else {
      await supabase.from('followers').delete().match({ follower_id: me.id, following_id: user.id })
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold">
              {user.display_name?.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-white font-bold text-sm truncate">{user.display_name}</p>
            {user.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 fill-blue-400 shrink-0" />}
          </div>
          <p className="text-zinc-500 text-xs truncate">@{user.username}</p>
        </div>
      </Link>
      {me?.id !== user.id && (
        <button
          onClick={handleFollow}
          className={`px-4 py-1.5 rounded-full text-sm font-bold shrink-0 transition ${
            following
              ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400'
              : 'bg-white text-black hover:bg-zinc-200'
          }`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}
