'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Post } from '@/types'
import { PostCard } from '@/components/feed/PostCard'
import { CommentSection } from '@/components/feed/CommentSection'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const router = useRouter()
  const { user } = useUserStore()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPost()
  }, [id, user])

  const fetchPost = async () => {
    if (!id) return
    setLoading(true)
    try {
      // 1. Fetch main post content
      const { data: p, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(*),
          media_files(*),
          post_reactions(count),
          comments(count),
          reposts(count)
        `)
        .eq('id', id)
        .single()

      if (error || !p) {
        console.error('Error fetching post detail:', error)
        setPost(null)
        return
      }

      // 2. Check if logged-in user liked/bookmarked/reposted
      let isLiked = false
      let isBookmarked = false
      let isReposted = false

      if (user) {
        const { data: rx } = await supabase
          .from('post_reactions')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        isLiked = !!rx

        const { data: bm } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        isBookmarked = !!bm

        const { data: rp } = await supabase
          .from('reposts')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        isReposted = !!rp
      }

      setPost({
        ...p,
        reactions_count: p.post_reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
        reposts_count: p.reposts?.[0]?.count ?? 0,
        is_liked: isLiked,
        is_bookmarked: isBookmarked,
        is_reposted: isReposted,
      } as Post)
    } catch (e) {
      console.error(e)
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
          <h1 className="text-white font-black text-sm tracking-tight">Post Thread</h1>
          <p className="text-xs text-zinc-500">Explore discussion & replies</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-500 text-xs">Loading discussion...</p>
          </div>
        ) : !post ? (
          <div className="text-center py-20 px-4">
            <div className="text-4xl mb-3">🧐</div>
            <p className="text-white font-bold">Post not found</p>
            <p className="text-zinc-500 text-sm mt-1">This thread may have been deleted or is unavailable.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-5 py-2 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition"
            >
              Back to Home Feed
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* The Main Post Card */}
            <PostCard post={post} onUpdate={fetchPost} />

            {/* Replies section header */}
            <div className="px-4 py-3 bg-white/[0.01] flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Replies ({post.comments_count})
              </span>
            </div>

            {/* The Comment section */}
            <CommentSection postId={post.id} />
          </div>
        )}
      </div>
    </div>
  )
}
