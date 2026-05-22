'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, MapPin, Smile, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { uploadMedia } from '@/lib/uploadMedia'

const MAX_CHARS = 280

interface PostComposerProps {
  onPost?: () => void
  placeholder?: string
  parentPostId?: string
}

export function PostComposer({
  onPost,
  placeholder = "What's happening?",
  parentPostId,
}: PostComposerProps) {
  const { user, profile } = useUserStore()
  const supabase = createClient()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0
  const progress = Math.min((content.length / MAX_CHARS) * 100, 100)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).slice(0, 4 - files.length)
    setFiles((prev) => [...prev, ...selected])
    selected.forEach((file) => {
      const url = URL.createObjectURL(file)
      setPreviews((prev) => [...prev, url])
    })
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const handlePost = async () => {
    if ((!content.trim() && files.length === 0) || !user || isOverLimit) return
    setLoading(true)
    try {
      // Extract hashtags
      const hashtagMatches = content.match(/#[\w]+/g) || []
      const hashtags = hashtagMatches.map((h) => h.slice(1).toLowerCase())

      // Create post
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          parent_post_id: parentPostId,
          location: location || null,
        })
        .select()
        .single()

      if (error || !post) throw error

      // Upload media
      for (const file of files) {
        const url = await uploadMedia(file, 'posts', user.id)
        if (url) {
          await supabase.from('media_files').insert({
            post_id: post.id,
            url,
            type: file.type.startsWith('video') ? 'video' : 'image',
          })
        }
      }

      // Save hashtags
      for (const tag of hashtags) {
        const { data: ht } = await supabase
          .from('hashtags')
          .upsert({ name: tag, post_count: 1 }, { onConflict: 'name' })
          .select()
          .single()
        if (ht) {
          await supabase
            .from('post_hashtags')
            .insert({ post_id: post.id, hashtag_id: ht.id })
        }
      }

      setContent('')
      setFiles([])
      setPreviews([])
      setLocation('')
      setShowLocationInput(false)
      onPost?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-4 border-b border-white/5">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <textarea
            className="w-full bg-transparent resize-none outline-none text-[17px] placeholder:text-zinc-600 text-white leading-relaxed min-h-[80px]"
            placeholder={placeholder}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CHARS + 50}
          />

          {/* Location input */}
          <AnimatePresence>
            {showLocationInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <input
                  type="text"
                  placeholder="Add location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none border border-white/10 focus:border-blue-500/50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Media previews */}
          {previews.length > 0 && (
            <div
              className={`grid gap-1 mb-3 ${
                previews.length === 1
                  ? 'grid-cols-1'
                  : previews.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2'
              }`}
            >
              {previews.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden">
                  {files[idx]?.type.startsWith('video') ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 4}
                className="p-2 rounded-full text-blue-400 hover:bg-blue-400/10 transition disabled:opacity-40"
              >
                <Image className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`p-2 rounded-full transition ${
                  showLocationInput
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-blue-400 hover:bg-blue-400/10'
                }`}
              >
                <MapPin className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full text-blue-400 hover:bg-blue-400/10 transition">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Character counter */}
              {content.length > 0 && (
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="#333" strokeWidth="2.5" />
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="none"
                      stroke={
                        isOverLimit ? '#ef4444' : remaining < 20 ? '#f59e0b' : '#3b82f6'
                      }
                      strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 13}`}
                      strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {remaining < 20 && (
                    <span
                      className={`absolute text-xs font-bold ${
                        isOverLimit ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {remaining}
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handlePost}
                disabled={
                  loading || (!content.trim() && files.length === 0) || isOverLimit
                }
                className="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
