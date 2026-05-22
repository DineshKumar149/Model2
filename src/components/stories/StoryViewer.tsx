'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Send,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { StoryGroup, StoryView } from '@/types'

interface StoryViewerProps {
  storyGroups: StoryGroup[]
  initialGroupIndex: number
  onClose: () => void
}

const DURATION_MS = 5000 // milliseconds each story stays visible

export function StoryViewer({
  storyGroups,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  const { user } = useUserStore()
  const supabase = createClient()

  // ── State ────────────────────────────────────────────────────────────────
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [liked, setLiked] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState<StoryView[]>([])
  const [loadingViewers, setLoadingViewers] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const replyInputRef = useRef<HTMLInputElement>(null)

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentGroup = storyGroups[groupIndex]
  const currentStory = currentGroup?.stories[storyIndex]
  const isOwn = user?.id === currentStory?.user_id
  const timeLeftSec = Math.max(
    0,
    Math.round((DURATION_MS * (1 - progress / 100)) / 1000)
  )

  // ── Navigation helpers ───────────────────────────────────────────────────
  const resetProgress = () => {
    setProgress(0)
    setMediaLoaded(false)
    setLiked(false)
  }

  const goNext = useCallback(() => {
    if (storyIndex < (currentGroup?.stories.length ?? 0) - 1) {
      setStoryIndex((i) => i + 1)
      resetProgress()
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((i) => i + 1)
      setStoryIndex(0)
      resetProgress()
    } else {
      onClose()
    }
  }, [storyIndex, groupIndex, currentGroup, storyGroups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
      resetProgress()
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1)
      setStoryIndex(0)
      resetProgress()
    }
  }, [storyIndex, groupIndex])

  const jumpToGroup = (idx: number) => {
    setGroupIndex(idx)
    setStoryIndex(0)
    resetProgress()
    setShowViewers(false)
  }

  // ── Progress timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentStory || paused || !mediaLoaded) return
    clearInterval(intervalRef.current!)

    // Record view in Supabase
    if (user) {
      supabase
        .from('story_views')
        .upsert(
          { story_id: currentStory.id, viewer_id: user.id },
          { onConflict: 'story_id,viewer_id' }
        )
        .then(({ error }) => {
          if (error)
            console.error('[StoryViewer] upsert view error:', error.message)
        })
    }

    const tick = 100 // ms per tick
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (100 / (DURATION_MS / tick))
        if (next >= 100) {
          clearInterval(intervalRef.current!)
          goNext()
          return 0
        }
        return next
      })
    }, tick)

    return () => clearInterval(intervalRef.current!)
  }, [currentStory?.id, paused, mediaLoaded, goNext])

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't hijack when typing in the reply input
      if (document.activeElement === replyInputRef.current) return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, onClose])

  // ── Fetch viewers (only for own stories) ────────────────────────────────
  const fetchViewers = async () => {
    if (!currentStory) return
    setLoadingViewers(true)
    const { data, error } = await supabase
      .from('story_views')
      .select('*, profiles(*)')
      .eq('story_id', currentStory.id)
      .order('viewed_at', { ascending: false })

    if (!error && data) setViewers(data as StoryView[])
    setLoadingViewers(false)
  }

  const handleShowViewers = () => {
    setShowViewers(true)
    setPaused(true)
    fetchViewers()
  }

  const handleHideViewers = () => {
    setShowViewers(false)
    setPaused(false)
  }

  // ── Send reply ────────────────────────────────────────────────────────────
  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !currentStory) return
    setSendingReply(true)
    // In a real app you'd create a DM / notification here
    // For now we just send a notification to the story owner
    await supabase.from('notifications').insert({
      user_id: currentStory.user_id,
      actor_id: user.id,
      type: 'story_view',
      post_id: null,
      is_read: false,
    })
    setReplyText('')
    setSendingReply(false)
  }

  // ── Guard ────────────────────────────────────────────────────────────────
  if (!currentGroup || !currentStory) return null

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* ── Prev group button (desktop) ── */}
        {groupIndex > 0 && (
          <button
            onClick={() => jumpToGroup(groupIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur"
            aria-label="Previous story group"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* ── Story card ── */}
        <motion.div
          key={`${groupIndex}-${storyIndex}`}
          className="relative max-w-sm w-full h-full sm:h-[90vh] sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: currentStory.bg_color || '#111' }}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* ── Progress bars ── */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {currentGroup.stories.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{
                    width:
                      i < storyIndex
                        ? '100%'
                        : i === storyIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                  transition={{ duration: 0 }} // real-time, no easing
                />
              </div>
            ))}
          </div>

          {/* ── Header ── */}
          <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-20 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shrink-0 shadow">
                {currentGroup.profile.avatar_url ? (
                  <img
                    src={currentGroup.profile.avatar_url}
                    alt={currentGroup.profile.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                    {currentGroup.profile.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Username & timer */}
              <div className="min-w-0">
                <p className="text-white text-sm font-bold leading-tight truncate drop-shadow">
                  {currentGroup.profile.username}
                </p>
                <p className="text-white/70 text-xs drop-shadow">{timeLeftSec}s</p>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white transition"
              aria-label="Close story viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Media (image / video) ── */}
          <div className="w-full h-full">
            {!mediaLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}

            {currentStory.media_type === 'video' ? (
              <video
                key={currentStory.media_url}
                src={currentStory.media_url}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                onCanPlay={() => setMediaLoaded(true)}
                onEnded={goNext}
              />
            ) : (
              <img
                key={currentStory.media_url}
                src={currentStory.media_url}
                alt="story"
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  mediaLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setMediaLoaded(true)}
              />
            )}
          </div>

          {/* ── Caption ── */}
          {currentStory.caption && (
            <motion.div
              className="absolute bottom-24 left-4 right-4 z-20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 text-center shadow-lg">
                {currentStory.caption}
              </p>
            </motion.div>
          )}

          {/* ── Footer ── */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center gap-2">
            {isOwn ? (
              /* Owner sees viewer count button */
              <button
                onClick={handleShowViewers}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm hover:bg-white/30 transition"
              >
                <Eye className="w-4 h-4" />
                <span>
                  {currentStory.story_views?.length ?? 0} viewer
                  {(currentStory.story_views?.length ?? 0) !== 1 ? 's' : ''}
                </span>
              </button>
            ) : (
              /* Others see reply input */
              <>
                <input
                  ref={replyInputRef}
                  type="text"
                  placeholder={`Reply to ${currentGroup.profile.username}…`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendReply()
                  }}
                  className="flex-1 bg-white/10 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 text-white text-sm placeholder:text-white/60 outline-none focus:border-white/60 transition min-w-0"
                />

                {/* Like button */}
                <motion.button
                  onClick={() => setLiked((v) => !v)}
                  whileTap={{ scale: 1.4 }}
                  className="p-2 shrink-0"
                  aria-label={liked ? 'Unlike story' : 'Like story'}
                >
                  <Heart
                    className={`w-6 h-6 transition-colors duration-200 ${
                      liked ? 'fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                </motion.button>

                {/* Send reply button */}
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="p-2 text-white shrink-0 disabled:opacity-40 hover:text-blue-400 transition"
                  aria-label="Send reply"
                >
                  {sendingReply ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </>
            )}
          </div>

          {/* ── Invisible navigation tap zones ── */}
          <button
            className="absolute left-0 top-16 bottom-20 w-1/3 z-10"
            onClick={goPrev}
            aria-label="Previous story"
          />
          <button
            className="absolute right-0 top-16 bottom-20 w-1/3 z-10"
            onClick={goNext}
            aria-label="Next story"
          />

          {/* ── Viewers panel (slide up from bottom) ── */}
          <AnimatePresence>
            {showViewers && (
              <motion.div
                className="absolute inset-x-0 bottom-0 z-30 bg-zinc-900/95 backdrop-blur-sm rounded-t-3xl border-t border-white/10"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h3 className="text-white font-bold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-400" />
                    Viewers
                  </h3>
                  <button
                    onClick={handleHideViewers}
                    className="text-zinc-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drag handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-zinc-700 rounded-full" />

                <div className="overflow-y-auto max-h-60 px-5 pb-6 space-y-3 mt-1">
                  {loadingViewers ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                    </div>
                  ) : viewers.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-6">
                      No viewers yet
                    </p>
                  ) : (
                    viewers.map((v) => (
                      <div
                        key={v.viewer_id}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-zinc-800">
                          {v.profiles?.avatar_url ? (
                            <img
                              src={v.profiles.avatar_url}
                              alt={v.profiles.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                              {v.profiles?.display_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium leading-tight truncate">
                            {v.profiles?.display_name}
                          </p>
                          <p className="text-zinc-500 text-xs truncate">
                            @{v.profiles?.username}
                          </p>
                        </div>
                        <p className="text-zinc-600 text-xs ml-auto shrink-0">
                          {new Date(v.viewed_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Next group button (desktop) ── */}
        {groupIndex < storyGroups.length - 1 && (
          <button
            onClick={() => jumpToGroup(groupIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur"
            aria-label="Next story group"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
