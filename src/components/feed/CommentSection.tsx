'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Reply, BadgeCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Comment } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'

interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user, profile } = useUserStore()
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchComments()

    // Real-time subscription
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) setComments((prev) => [...prev, data as Comment])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
    if (data) setComments(data as Comment[])
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return
    setLoading(true)
    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: newComment,
      parent_id: replyingTo?.id || null,
    })
    setNewComment('')
    setReplyingTo(null)
    setLoading(false)
  }

  return (
    <div className="px-4">
      {/* Comment input */}
      {user && (
        <div className="flex gap-3 py-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                  {profile?.display_name?.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            {replyingTo && (
              <div className="text-xs text-blue-400 mb-1">
                Replying to @{replyingTo.profiles?.username}
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 text-zinc-500 hover:text-zinc-300 transition"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.profiles?.username}...`
                    : 'Add a comment...'
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none border border-white/10 focus:border-blue-500/50 transition"
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || loading}
                className="px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-bold disabled:opacity-40 hover:bg-blue-600 transition"
              >
                {loading ? '...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y divide-white/5">
        {comments.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-zinc-500 text-sm">No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onReply={setReplyingTo} />
          ))
        )}
      </div>
    </div>
  )
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: Comment
  onReply: (c: Comment) => void
}) {
  const { user } = useUserStore()
  const supabase = createClient()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => (newLiked ? c + 1 : c - 1))
    if (newLiked) {
      await supabase
        .from('comment_reactions')
        .insert({ comment_id: comment.id, user_id: user.id })
    } else {
      await supabase
        .from('comment_reactions')
        .delete()
        .match({ comment_id: comment.id, user_id: user.id })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3 flex gap-3"
    >
      <Link href={`/profile/${comment.profiles?.username}`} className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-[1.5px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
            {comment.profiles?.avatar_url ? (
              <img
                src={comment.profiles.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                {comment.profiles?.display_name?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/profile/${comment.profiles?.username}`}
            className="text-sm font-bold text-white hover:underline"
          >
            {comment.profiles?.display_name}
          </Link>
          {comment.profiles?.is_verified && (
            <BadgeCheck className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
          )}
          <span className="text-xs text-zinc-500">
            · {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-4 mt-1.5">
          <button
            onClick={() => onReply(comment)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-blue-400 transition"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-pink-400 transition"
          >
            <Heart
              className={`w-3.5 h-3.5 ${liked ? 'fill-pink-500 text-pink-500' : ''}`}
            />
            {likeCount > 0 && likeCount}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
