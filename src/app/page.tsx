'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/types'
import { PostCard } from '@/components/feed/PostCard'
import { PostComposer } from '@/components/feed/PostComposer'
import { StoriesBar } from '@/components/stories/StoriesBar'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you')
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select(
        `
        *,
        profiles(*),
        media_files(*),
        post_reactions(count),
        comments(count),
        reposts(count)
      `
      )
      .is('parent_post_id', null)
      .eq('is_reel', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (data) {
      setPosts(
        data.map((p: any) => ({
          ...p,
          reactions_count: p.post_reactions?.[0]?.count ?? 0,
          comments_count: p.comments?.[0]?.count ?? 0,
          reposts_count: p.reposts?.[0]?.count ?? 0,
        }))
      )
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchPosts()

    // Real-time new posts
    const channel = supabase
      .channel('feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        () => {
          fetchPosts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPosts])

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Home
          </h1>
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>

        {/* Tabs */}
        <div className="flex">
          {(['for-you', 'following'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition relative ${
                activeTab === tab
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'for-you' ? 'For You' : 'Following'}
              {activeTab === tab && (
                <motion.div
                  layoutId="feedTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stories */}
      <StoriesBar />

      {/* Composer */}
      <PostComposer onPost={fetchPosts} />

      {/* Feed */}
      <div>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border-b border-white/5 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-24 bg-white/10 rounded-xl w-full mt-2" />
                </div>
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-white font-bold text-lg">Welcome to your feed!</p>
            <p className="text-zinc-500 text-sm mt-1">
              Follow people and share your first post.
            </p>
          </div>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <PostCard post={post} onUpdate={fetchPosts} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
