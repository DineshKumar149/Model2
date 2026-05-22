'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  Loader2,
  ImagePlus,
  AlignCenter,
  Palette,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import { uploadMedia } from '@/lib/uploadMedia'

interface StoryCreatorProps {
  onClose: () => void
}

// Preset background colour swatches
const BG_COLORS = [
  { label: 'Midnight', value: '#0f0f1a' },
  { label: 'Navy',     value: '#16213e' },
  { label: 'Ocean',    value: '#0f3460' },
  { label: 'Violet',   value: '#7c3aed' },
  { label: 'Pink',     value: '#db2777' },
  { label: 'Emerald',  value: '#059669' },
  { label: 'Amber',    value: '#d97706' },
  { label: 'Crimson',  value: '#dc2626' },
  { label: 'Slate',    value: '#334155' },
  { label: 'Teal',     value: '#0d9488' },
]

// Max file sizes
const MAX_IMAGE_MB = 10
const MAX_VIDEO_MB = 100

export function StoryCreator({ onClose }: StoryCreatorProps) {
  const { user } = useUserStore()
  const supabase = createClient()

  // ── State ───────────────────────────────────────────────────────────────
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [bgColor, setBgColor] = useState(BG_COLORS[0].value)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'media' | 'text'>('media')
  const [dragOver, setDragOver] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // ── File handling ────────────────────────────────────────────────────────
  const processFile = useCallback((f: File) => {
    setError(null)
    const isVideo = f.type.startsWith('video')
    const isImage = f.type.startsWith('image')
    if (!isImage && !isVideo) {
      setError('Only image and video files are supported.')
      return
    }
    const limitMB = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB
    if (f.size > limitMB * 1024 * 1024) {
      setError(`File too large. Max ${limitMB} MB for ${isVideo ? 'videos' : 'images'}.`)
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  const clearMedia = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setError(null)
  }

  // ── Post story ────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!user) return
    if (!file && !caption.trim()) {
      setError('Please add a photo/video or write some text.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let mediaUrl = ''
      let mediaType: 'image' | 'video' = 'image'

      if (file) {
        const url = await uploadMedia(file, 'stories', user.id)
        if (!url) throw new Error('Upload failed. Please try again.')
        mediaUrl = url
        mediaType = file.type.startsWith('video') ? 'video' : 'image'
      } else {
        // Text-only story — use a solid colour tile
        mediaUrl = `https://via.placeholder.com/720x1280/${bgColor.replace('#', '')}/ffffff?text=`
        mediaType = 'image'
      }

      // Stories expire after 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { error: dbError } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
        bg_color: bgColor,
        expires_at: expiresAt,
      })

      if (dbError) throw new Error(dbError.message)

      onClose()
    } catch (err: any) {
      console.error('[StoryCreator] handlePost error:', err)
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          className="relative w-full max-w-sm bg-zinc-950 sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          initial={{ scale: 0.95, y: 60 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          {/* ── Preview / Drop zone ── */}
          <div
            className="relative h-[420px] flex items-center justify-center overflow-hidden transition-colors duration-300"
            style={{ background: bgColor }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            <AnimatePresence>
              {dragOver && (
                <motion.div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-blue-500/30 border-2 border-dashed border-blue-400 rounded-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-white font-bold text-lg">Drop to upload</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Media preview */}
            {preview ? (
              <>
                {file?.type.startsWith('video') ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Remove media button */}
                <button
                  onClick={clearMedia}
                  className="absolute top-4 left-4 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition z-10"
                  aria-label="Remove media"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : activeTab === 'media' ? (
              /* Upload prompt */
              <motion.button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-4 text-white/50 hover:text-white/80 transition group"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 group-hover:border-white/40 flex items-center justify-center transition">
                  <ImagePlus className="w-9 h-9" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/70">
                    Upload photo or video
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    or drag &amp; drop here
                  </p>
                </div>
              </motion.button>
            ) : (
              /* Text-only mode preview */
              <div className="w-full h-full flex items-center justify-center px-8">
                <p className="text-white text-2xl font-bold text-center leading-snug break-words">
                  {caption || (
                    <span className="text-white/30 text-lg">
                      Type your story text below…
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Caption overlay (when media is selected) */}
            {preview && caption && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <p className="text-white font-medium text-center bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 text-sm shadow-lg">
                  {caption}
                </p>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition z-10"
              aria-label="Close story creator"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Mode tabs (top-centre) */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 backdrop-blur-sm rounded-full p-1 z-10">
              <button
                onClick={() => setActiveTab('media')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  activeTab === 'media'
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Upload className="w-3 h-3" />
                Media
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  activeTab === 'text'
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <AlignCenter className="w-3 h-3" />
                Text
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* ── Controls area ── */}
          <div className="p-4 space-y-3 bg-zinc-950">
            {/* ── Background colour picker ── */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
                <Palette className="w-3.5 h-3.5" />
                <span>Background</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                {BG_COLORS.map((c) => (
                  <motion.button
                    key={c.value}
                    onClick={() => setBgColor(c.value)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full shrink-0 border-2 transition ${
                      bgColor === c.value
                        ? 'border-white shadow-lg shadow-white/20'
                        : 'border-transparent hover:border-white/40'
                    }`}
                    style={{ background: c.value }}
                    whileTap={{ scale: 1.3 }}
                    animate={bgColor === c.value ? { scale: 1.2 } : { scale: 1 }}
                  />
                ))}
              </div>
            </div>

            {/* ── Caption input ── */}
            <input
              type="text"
              placeholder="Add a caption…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              className="w-full bg-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-500 outline-none border border-white/10 focus:border-white/30 transition"
            />

            {/* Character counter */}
            {caption.length > 0 && (
              <div className="text-right">
                <span
                  className={`text-xs ${
                    caption.length > 180 ? 'text-red-400' : 'text-zinc-600'
                  }`}
                >
                  {caption.length}/200
                </span>
              </div>
            )}

            {/* ── Error message ── */}
            <AnimatePresence>
              {error && (
                <motion.p
                  className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* ── Share button ── */}
            <motion.button
              onClick={handlePost}
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sharing…</span>
                </>
              ) : (
                'Share to Story'
              )}
            </motion.button>

            {/* ── Info note ── */}
            <p className="text-zinc-600 text-xs text-center">
              Stories disappear after 24 hours
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
