'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { StoryGroup } from '@/types'

export function StoriesBar() {
  const { user, profile } = useUserStore()
  const supabase = createClient()
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchStories = async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const { data } = await supabase
        .from('stories')
        .select('*, profiles(*)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) {
        // Group by user
        const grouped: Record<string, StoryGroup> = {}
        for (const story of data) {
          const uid = story.user_id
          if (!grouped[uid]) {
            grouped[uid] = {
              profile: story.profiles,
              stories: [],
              hasUnviewed: false,
            }
          }
          grouped[uid].stories.push(story)
          if (!story.is_viewed) grouped[uid].hasUnviewed = true
        }
        setStoryGroups(Object.values(grouped))
      }
    } catch (err) {
      console.error('Failed to fetch stories:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-3 border-b border-white/5 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-white/10" />
            <div className="h-2.5 w-12 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 px-4 py-3 border-b border-white/5 overflow-x-auto scrollbar-hide">
      {/* Add your story */}
      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
        >
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 p-[2px] group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                    {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
            </div>
            {/* Plus badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 border-2 border-zinc-950 flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 group-hover:text-white transition font-medium w-16 text-center truncate">
            Your story
          </span>
        </motion.div>
      )}

      {/* Story groups */}
      {storyGroups.map((group, i) => (
        <motion.div
          key={group.profile.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
        >
          <div
            className={`w-16 h-16 rounded-full p-[2.5px] ${
              group.hasUnviewed
                ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400'
                : 'bg-zinc-700'
            } group-hover:scale-105 transition-transform duration-200`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-950">
              {group.profile.avatar_url ? (
                <img
                  src={group.profile.avatar_url}
                  alt={group.profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                  {group.profile.display_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] text-zinc-400 group-hover:text-white transition font-medium w-16 text-center truncate">
            {group.profile.display_name}
          </span>
        </motion.div>
      ))}

      {/* Empty state */}
      {storyGroups.length === 0 && !loading && (
        <div className="flex items-center text-xs text-zinc-600 py-2">
          No stories from people you follow yet.
        </div>
      )}
    </div>
  )
}
