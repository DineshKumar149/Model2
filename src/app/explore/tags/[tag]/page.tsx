'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Hash, Heart, MessageCircle, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Post } from '@/types'
import Link from 'next/link'

export default function TagExplorerPage() {
  const { tag } = useParams<{ tag: string }>()
  const supabase = createClient()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tag) fetchPosts()
  }, [tag])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      // Fetch posts containing exact tag search
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          media_files(*),
          post_reactions(count),
          comments(count)
        `)
        .ilike('content', `%#${tag}%`)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setPosts(
          data.map((p: any) => ({
            ...p,
            reactions_count: p.post_reactions?.[0]?.count ?? 0,
            comments_count: p.comments?.[0]?.count ?? 0,
          })) as Post[]
        )
      }
    } catch (e) {
      console.error('Error fetching posts for tag:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[600px] mx-auto min-h-screen bg-zinc-950 flex flex-col pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-white font-black text-sm tracking-tight flex items-center gap-1">
            <Hash className="w-4 h-4 text-blue-400" />
            {tag}
          </h1>
          <p className="text-xs text-zinc-500">Explorer tag archive</p>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-xs">Loading tagged posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Hash className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-white font-bold text-sm">No posts yet</p>
            <p className="text-zinc-500 text-xs mt-1">Be the first to create a post with #{tag}!</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-5 py-2.5 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition"
            >
              Go Make a Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                #
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">#{tag}</h2>
                <p className="text-xs text-zinc-500 font-medium">{posts.length} posts matching tag</p>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1">
              {posts.map((post, idx) => {
                const firstMedia = post.media_files?.[0]
                const hasMedia = !!firstMedia

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/5 bg-zinc-900 group cursor-pointer"
                  >
                    <Link href={`/post/${post.id}`} className="block w-full h-full">
                      {hasMedia ? (
                        <>
                          {firstMedia.type === 'video' ? (
                            <div className="relative w-full h-full">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                              <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white pointer-events-none">
                                <Play className="w-3 h-3 fill-white" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={firstMedia.url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                        </>
                      ) : (
                        /* Text Post Fallback - premium mini card layout */
                        <div className="w-full h-full p-2.5 flex flex-col justify-between bg-gradient-to-br from-zinc-900 to-zinc-950 select-none">
                          <p className="text-[10px] text-zinc-300 leading-normal line-clamp-4 font-mono font-medium">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-1 border-t border-white/5 pt-1 text-[8px] text-zinc-500 font-bold">
                            @{post.profiles?.username}
                          </div>
                        </div>
                      )}

                      {/* Glassmorphic Interaction Overlay */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 text-white font-bold text-xs transition-opacity duration-200">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                          <span>{post.reactions_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 text-blue-400 fill-blue-400" />
                          <span>{post.comments_count}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
