'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, BadgeCheck, Settings, MapPin, Link as LinkIcon,
  Calendar, Camera, Edit3, Grid3X3, List, Film, Bookmark, Heart
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { Profile, Post, StoryHighlight } from '@/types'
import { formatRelativeTime } from '@/lib/formatDate'
import { PostCard } from '@/components/feed/PostCard'
import Link from 'next/link'

type GridTab = 'posts' | 'reels' | 'media' | 'likes'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user, profile: myProfile } = useUserStore()
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [highlights, setHighlights] = useState<StoryHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [gridTab, setGridTab] = useState<GridTab>('posts')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followers, setFollowers] = useState<Profile[]>([])
  const [following, setFollowing] = useState<Profile[]>([])

  const isOwn = user && profile && user.id === profile.id

  useEffect(() => {
    if (!username) return
    fetchProfile()
  }, [username])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
    if (!data) { setLoading(false); return }
    setProfile(data)

    // Stats
    const [{ count: fwrs }, { count: fwng }, { data: followCheck }] = await Promise.all([
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
      supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', data.id),
      user ? supabase.from('followers').select('*').eq('follower_id', user.id).eq('following_id', data.id).single() : Promise.resolve({ data: null }),
    ])
    setFollowersCount(fwrs || 0)
    setFollowingCount(fwng || 0)
    setIsFollowing(!!followCheck)

    // Highlights
    const { data: hl } = await supabase.from('story_highlights').select('*').eq('user_id', data.id)
    if (hl) setHighlights(hl)

    fetchPosts(data.id)
    setLoading(false)
  }

  const fetchPosts = async (userId: string) => {
    let query = supabase
      .from('posts')
      .select('*, profiles(*), media_files(*), post_reactions(count), comments(count)')
      .eq('user_id', userId)
      .is('parent_post_id', null)
      .order('created_at', { ascending: false })

    if (gridTab === 'reels') query = query.eq('is_reel', true)
    if (gridTab === 'media') query = query.not('media_files', 'is', null)

    const { data } = await query
    if (data) {
      setPosts(data.map((p: any) => ({
        ...p,
        reactions_count: p.post_reactions?.[0]?.count ?? 0,
        comments_count: p.comments?.[0]?.count ?? 0,
      })))
    }
  }

  const handleFollow = async () => {
    if (!user || !profile) return
    const newF = !isFollowing
    setIsFollowing(newF)
    setFollowersCount((c) => newF ? c + 1 : c - 1)
    if (newF) {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: profile.id })
      // Create notification
      await supabase.from('notifications').insert({
        user_id: profile.id, actor_id: user.id, type: 'follow'
      })
    } else {
      await supabase.from('followers').delete().match({ follower_id: user.id, following_id: profile.id })
    }
  }

  const loadFollowers = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('followers')
      .select('profiles!follower_id(*)')
      .eq('following_id', profile.id)
    if (data) setFollowers(data.map((d: any) => d.profiles))
    setShowFollowers(true)
  }

  const loadFollowing = async () => {
    if (!profile) return
    const { data } = await supabase
      .from('followers')
      .select('profiles!following_id(*)')
      .eq('follower_id', profile.id)
    if (data) setFollowing(data.map((d: any) => d.profiles))
    setShowFollowing(true)
  }

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto animate-pulse">
        <div className="h-40 bg-white/5" />
        <div className="p-4">
          <div className="w-24 h-24 rounded-full bg-white/10 -mt-12 mb-3" />
          <div className="h-5 bg-white/10 rounded w-32 mb-2" />
          <div className="h-3 bg-white/10 rounded w-48" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-[600px] mx-auto py-20 text-center">
        <p className="text-white font-bold text-xl">User not found</p>
        <button onClick={() => router.push('/')} className="mt-4 text-blue-400 hover:underline">Go home</button>
      </div>
    )
  }

  const gridPosts = posts.filter((p) => {
    if (gridTab === 'media') return (p.media_files?.length ?? 0) > 0
    if (gridTab === 'reels') return p.is_reel
    return true
  })

  return (
    <div className="max-w-[600px] mx-auto min-h-screen">
      {/* Back button */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white p-1 hover:bg-white/10 rounded-full transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-white font-bold">{profile.display_name}</p>
          <p className="text-zinc-500 text-xs">{posts.length} posts</p>
        </div>
      </div>

      {/* Cover image */}
      <div className="relative h-40 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 overflow-hidden">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-800 to-pink-900" />
        )}
        {isOwn && (
          <button className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition">
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-12 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-black text-3xl">
                  {profile.display_name?.charAt(0)}
                </div>
              )}
            </div>
            {isOwn && (
              <button className="absolute bottom-1 right-1 p-1.5 rounded-full bg-zinc-900 border border-white/20 text-white hover:bg-zinc-800 transition">
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions */}
          {isOwn ? (
            <Link
              href="/settings/profile"
              className="px-5 py-2 rounded-full border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit profile
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                href={`/messages/new?user=${profile.id}`}
                className="px-4 py-2 rounded-full border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition"
              >
                Message
              </Link>
              <button
                onClick={handleFollow}
                className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                  isFollowing
                    ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-black text-white">{profile.display_name}</h1>
            {profile.is_verified && (
              <BadgeCheck className="w-5 h-5 text-blue-400 fill-blue-400" />
            )}
          </div>
          <p className="text-zinc-500 text-sm">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-zinc-200 text-sm leading-relaxed mb-3">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 mb-4">
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
              <LinkIcon className="w-3.5 h-3.5" />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm mb-4">
          <button onClick={loadFollowing} className="hover:underline">
            <span className="text-white font-bold">{followingCount}</span>
            <span className="text-zinc-500 ml-1">Following</span>
          </button>
          <button onClick={loadFollowers} className="hover:underline">
            <span className="text-white font-bold">{followersCount}</span>
            <span className="text-zinc-500 ml-1">Followers</span>
          </button>
        </div>

        {/* Story Highlights */}
        {highlights.length > 0 && (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 mb-2">
            {highlights.map((hl) => (
              <div key={hl.id} className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden bg-zinc-800">
                  {hl.cover_url ? (
                    <img src={hl.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                  )}
                </div>
                <span className="text-xs text-zinc-400 truncate w-16 text-center">{hl.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid tabs */}
      <div className="border-t border-white/5">
        <div className="flex">
          {[
            { key: 'posts' as const, icon: List, label: 'Posts' },
            { key: 'reels' as const, icon: Film, label: 'Reels' },
            { key: 'media' as const, icon: Grid3X3, label: 'Photos' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setGridTab(key)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 relative text-xs font-medium transition ${
                gridTab === key ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {gridTab === key && (
                <motion.div
                  layoutId="profileTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      {gridTab === 'media' ? (
        <div className="grid grid-cols-3 gap-0.5">
          {gridPosts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="aspect-square overflow-hidden relative group">
              {post.media_files?.[0]?.type === 'video' ? (
                <video src={post.media_files[0].url} className="w-full h-full object-cover" />
              ) : (
                <img src={post.media_files?.[0]?.url || ''} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-3 text-white text-sm font-bold">
                  <span className="flex items-center gap-1"><Heart className="w-4 h-4 fill-white" />{post.reactions_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div>
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {posts.length === 0 && (
        <div className="py-20 text-center">
          <Grid3X3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-white font-bold">No posts yet</p>
          {isOwn && <p className="text-zinc-500 text-sm mt-1">Share your first post!</p>}
        </div>
      )}

      {/* Followers Modal */}
      <AnimatePresence>
        {(showFollowers || showFollowing) && (
          <FollowModal
            title={showFollowers ? 'Followers' : 'Following'}
            users={showFollowers ? followers : following}
            onClose={() => { setShowFollowers(false); setShowFollowing(false) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FollowModal({ title, users, onClose }: { title: string; users: Profile[]; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-white/10 w-full sm:max-w-sm max-h-[70vh] overflow-hidden flex flex-col"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-bold">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {users.map((u) => (
            <Link key={u.id} href={`/profile/${u.username}`} onClick={onClose}
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">{u.display_name?.charAt(0)}</div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-white font-bold text-sm">{u.display_name}</p>
                  {u.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />}
                </div>
                <p className="text-zinc-500 text-xs">@{u.username}</p>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
