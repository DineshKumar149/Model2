'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  BadgeCheck,
  Play,
  Volume2,
  VolumeX,
  MapPin,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/formatDate'
import { Post } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'

interface PostCardProps {
  post: Post
  onUpdate?: () => void
  compact?: boolean
}

export function PostCard({ post, onUpdate, compact = false }: PostCardProps) {
  const { user } = useUserStore()
  const supabase = createClient()
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(post.reactions_count ?? 0)
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked ?? false)
  const [reposted, setReposted] = useState(post.is_reposted ?? false)
  const [repostCount, setRepostCount] = useState(post.reposts_count ?? 0)
  const [showHeart, setShowHeart] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTapRef = useRef<number>(0)

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => (newLiked ? c + 1 : c - 1))
    if (newLiked) {
      await supabase
        .from('post_reactions')
        .insert({ post_id: post.id, user_id: user.id, type: 'like' })
    } else {
      await supabase
        .from('post_reactions')
        .delete()
        .match({ post_id: post.id, user_id: user.id })
    }
  }

  const handleBookmark = async () => {
    if (!user) return
    const newBookmarked = !bookmarked
    setBookmarked(newBookmarked)
    if (newBookmarked) {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: post.id })
    } else {
      await supabase
        .from('bookmarks')
        .delete()
        .match({ user_id: user.id, post_id: post.id })
    }
  }

  const handleRepost = async () => {
    if (!user) return
    const newReposted = !reposted
    setReposted(newReposted)
    setRepostCount((c) => (newReposted ? c + 1 : c - 1))
    if (newReposted) {
      await supabase.from('reposts').insert({ user_id: user.id, post_id: post.id })
    } else {
      await supabase
        .from('reposts')
        .delete()
        .match({ user_id: user.id, post_id: post.id })
    }
  }

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (!liked) handleLike()
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
    lastTapRef.current = now
  }

  const highlightContent = (text: string) => {
    const parts = text.split(/(#[\w]+|@[\w]+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span key={i} className="text-blue-400 hover:underline cursor-pointer">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const media = post.media_files || []
  const hasMedia = media.length > 0

  return (
    <article className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
      <div className="p-4">
        {/* Repost indicator */}
        {post.is_reposted && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 ml-10">
            <Repeat2 className="w-3.5 h-3.5" />
            <span>You reposted</span>
          </div>
        )}

        <div className="flex gap-3">
          {/* Avatar */}
          <Link href={`/profile/${post.profiles?.username}`} className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] hover:opacity-90 transition">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                {post.profiles?.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {post.profiles?.display_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/profile/${post.profiles?.username}`}
                  className="font-bold text-[15px] hover:underline text-white"
                >
                  {post.profiles?.display_name}
                </Link>
                {post.profiles?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-400 fill-blue-400" />
                )}
                <span className="text-muted-foreground text-sm">
                  @{post.profiles?.username}
                </span>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm hover:underline">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-muted-foreground hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 top-8 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 min-w-[180px] overflow-hidden"
                    >
                      {user?.id === post.user_id && (
                        <button className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5">
                          Delete post
                        </button>
                      )}
                      <button className="w-full px-4 py-3 text-left text-sm hover:bg-white/5">
                        Copy link
                      </button>
                      <button className="w-full px-4 py-3 text-left text-sm hover:bg-white/5">
                        Not interested
                      </button>
                      {user?.id !== post.user_id && (
                        <button className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5">
                          Report
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Location */}
            {post.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{post.location}</span>
              </div>
            )}

            {/* Content */}
            {post.content && (
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-100">
                {highlightContent(post.content)}
              </p>
            )}

            {/* Media */}
            {hasMedia && (
              <div
                className={`mt-3 rounded-2xl overflow-hidden border border-white/10 relative ${
                  media.length === 1 ? '' : 'grid gap-0.5'
                } ${media.length === 2 ? 'grid-cols-2' : ''} ${
                  media.length >= 3 ? 'grid-cols-2' : ''
                }`}
                onClick={handleDoubleTap}
              >
                {/* Double-tap heart animation */}
                <AnimatePresence>
                  {showHeart && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.2 }}
                      exit={{ opacity: 0, scale: 1.5 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {media.slice(0, 4).map((file, idx) => (
                  <div
                    key={file.id}
                    className={`relative overflow-hidden ${
                      media.length === 1 ? 'aspect-video max-h-96' : 'aspect-square'
                    } ${media.length === 3 && idx === 0 ? 'row-span-2' : ''}`}
                  >
                    {file.type === 'video' ? (
                      <div className="relative w-full h-full bg-black">
                        <video
                          ref={videoRef}
                          src={file.url}
                          className="w-full h-full object-cover"
                          muted={muted}
                          loop
                          playsInline
                          autoPlay
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (videoRef.current) {
                                videoRef.current.paused
                                  ? videoRef.current.play()
                                  : videoRef.current.pause()
                              }
                            }}
                            className="p-3 rounded-full bg-black/50 text-white"
                          >
                            <Play className="w-6 h-6 fill-white" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMuted(!muted)
                          }}
                          className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                        >
                          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <img src={file.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {idx === 3 && media.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">+{media.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-xs text-muted-foreground">
              {/* Comment */}
              <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 group">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition">
                  <MessageCircle className="w-[18px] h-[18px] group-hover:text-blue-400 transition" />
                </div>
                <span className="text-sm group-hover:text-blue-400 transition">
                  {post.comments_count || 0}
                </span>
              </Link>

              {/* Repost */}
              <button onClick={handleRepost} className="flex items-center gap-1.5 group">
                <div className="p-2 rounded-full group-hover:bg-green-500/10 transition">
                  <Repeat2
                    className={`w-[18px] h-[18px] transition ${
                      reposted ? 'text-green-400' : 'group-hover:text-green-400'
                    }`}
                  />
                </div>
                <span
                  className={`text-sm transition ${
                    reposted ? 'text-green-400' : 'group-hover:text-green-400'
                  }`}
                >
                  {repostCount}
                </span>
              </button>

              {/* Like */}
              <button onClick={handleLike} className="flex items-center gap-1.5 group">
                <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition">
                  <motion.div
                    animate={liked ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart
                      className={`w-[18px] h-[18px] transition ${
                        liked ? 'text-pink-500 fill-pink-500' : 'group-hover:text-pink-400'
                      }`}
                    />
                  </motion.div>
                </div>
                <span
                  className={`text-sm transition ${
                    liked ? 'text-pink-500' : 'group-hover:text-pink-400'
                  }`}
                >
                  {likeCount}
                </span>
              </button>

              {/* Share */}
              <button className="flex items-center gap-1.5 group">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition">
                  <Share2 className="w-[18px] h-[18px] group-hover:text-blue-400 transition" />
                </div>
              </button>

              {/* Bookmark */}
              <button onClick={handleBookmark} className="group">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition">
                  {bookmarked ? (
                    <BookmarkCheck className="w-[18px] h-[18px] text-blue-400" />
                  ) : (
                    <Bookmark className="w-[18px] h-[18px] group-hover:text-blue-400 transition" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
