'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { PostCard } from '@/components/feed/PostCard'
import { Bookmark } from 'lucide-react'
import { Post } from '@/types'
import { motion } from 'framer-motion'

export default function BookmarksPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('posts(*, profiles(*), media_files(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) {
        setPosts(
          data
            .map((b: any) => b.posts)
            .filter(Boolean) as Post[]
        )
      }
      setLoading(false)
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <Bookmark className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-black text-white">Bookmarks</h1>
        </div>
        {!loading && posts.length > 0 && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {posts.length} saved post{posts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="divide-y divide-white/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-24 text-center px-8">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
            <Bookmark className="w-10 h-10 text-blue-400" />
          </div>
          <p className="text-white font-bold text-xl">No bookmarks yet</p>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Save posts you want to revisit later by tapping the bookmark icon on any post.
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <PostCard key={post.id} post={post} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
