'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Volume2, VolumeX, Heart, MessageCircle, Share2, Bookmark, BookmarkCheck, UserPlus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Post } from '@/types'
import Link from 'next/link'

export default function ReelsPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  const [reels, setReels] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(*), media_files(*), post_reactions(count), comments(count)')
        .eq('is_reel', true)
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) {
        setReels(data.map((p: any) => ({
          ...p,
          reactions_count: p.post_reactions?.[0]?.count ?? 0,
          comments_count: p.comments?.[0]?.count ?? 0,
        })))
      }
    }
    fetch()
  }, [])

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black">
      {reels.length === 0 ? (
        <div className="h-screen flex flex-col items-center justify-center text-zinc-500">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-white font-bold text-xl">No Reels Yet</p>
          <p className="text-zinc-500 mt-2">Share your first video as a Reel!</p>
        </div>
      ) : (
        reels.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            isActive={i === currentIndex}
            muted={muted}
            onMuteToggle={() => setMuted(!muted)}
            onVisible={() => setCurrentIndex(i)}
          />
        ))
      )}
    </div>
  )
}

function ReelCard({
  reel,
  isActive,
  muted,
  onMuteToggle,
  onVisible,
}: {
  reel: Post
  isActive: boolean
  muted: boolean
  onMuteToggle: () => void
  onVisible: () => void
}) {
  const { user } = useUserStore()
  const supabase = createClient()
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(reel.is_liked ?? false)
  const [likeCount, setLikeCount] = useState(reel.reactions_count ?? 0)
  const [bookmarked, setBookmarked] = useState(reel.is_bookmarked ?? false)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (isActive) {
      el.play().catch(() => {})
    } else {
      el.pause()
      el.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible() },
      { threshold: 0.6 }
    )
    if (videoRef.current?.parentElement) {
      observer.observe(videoRef.current.parentElement)
    }
    return () => observer.disconnect()
  }, [onVisible])

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount((c) => newLiked ? c + 1 : c - 1)
    if (newLiked) {
      await supabase.from('post_reactions').insert({ post_id: reel.id, user_id: user.id, type: 'like' })
    } else {
      await supabase.from('post_reactions').delete().match({ post_id: reel.id, user_id: user.id })
    }
  }

  const handleBookmark = async () => {
    if (!user) return
    const newBm = !bookmarked
    setBookmarked(newBm)
    if (newBm) {
      await supabase.from('bookmarks').insert({ user_id: user.id, post_id: reel.id })
    } else {
      await supabase.from('bookmarks').delete().match({ user_id: user.id, post_id: reel.id })
    }
  }

  const handleFollow = async () => {
    if (!user || !reel.profiles) return
    const newFollowing = !following
    setFollowing(newFollowing)
    if (newFollowing) {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: reel.profiles.id })
    } else {
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: reel.profiles.id })
    }
  }

  const videoUrl = reel.media_files?.[0]?.url

  return (
    <div className="relative h-screen snap-start flex items-center justify-center bg-black overflow-hidden">
      {/* Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={muted}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
          <p className="text-white text-lg font-bold p-8 text-center">{reel.content}</p>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Right actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center">
            <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart className={`w-8 h-8 ${liked ? 'fill-red-500 text-red-500' : 'text-white'} drop-shadow-lg`} />
            </motion.div>
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{likeCount}</span>
        </button>

        {/* Comment */}
        <Link href={`/post/${reel.id}`} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">{reel.comments_count ?? 0}</span>
        </Link>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center">
            <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow">Share</span>
        </button>

        {/* Bookmark */}
        <button onClick={handleBookmark} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center">
            {bookmarked
              ? <BookmarkCheck className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              : <Bookmark className="w-8 h-8 text-white drop-shadow-lg" />
            }
          </div>
        </button>

        {/* Mute */}
        <button onClick={onMuteToggle} className="w-12 h-12 flex items-center justify-center">
          {muted
            ? <VolumeX className="w-7 h-7 text-white drop-shadow-lg" />
            : <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />
          }
        </button>

        {/* Avatar + Follow */}
        <div className="relative">
          <Link href={`/profile/${reel.profiles?.username}`}>
            <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden">
              {reel.profiles?.avatar_url ? (
                <img src={reel.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  {reel.profiles?.display_name?.charAt(0)}
                </div>
              )}
            </div>
          </Link>
          {user?.id !== reel.user_id && (
            <button
              onClick={handleFollow}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white border-2 border-black"
            >
              <span className="text-xs font-black">{following ? '✓' : '+'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-8 left-4 right-20">
        <Link href={`/profile/${reel.profiles?.username}`} className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-sm">@{reel.profiles?.username}</span>
        </Link>
        {reel.content && (
          <p className="text-white text-sm leading-relaxed line-clamp-2">{reel.content}</p>
        )}
      </div>
    </div>
  )
}
