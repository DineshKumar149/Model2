'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Zap, Timer, Download, Send, RefreshCw, X, Sparkles, 
  Smile, Film, Check, ChevronLeft, Volume2, VolumeX, Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUserStore } from '@/store/useUserStore'
import Link from 'next/link'

type LensFilter = 'none' | 'cyberpunk' | 'vintage' | 'beauty' | 'noir'

interface Lens {
  id: LensFilter
  name: string
  icon: string
  color: string
  filterClass: string
}

export default function SnapchatCameraPage() {
  const { user } = useUserStore()
  const supabase = createClient()
  
  const [activeLens, setActiveLens] = useState<LensFilter>('none')
  const [flash, setFlash] = useState(false)
  const [timer, setTimer] = useState<0 | 3 | 5>(0)
  const [duration, setDuration] = useState<'once' | '3s' | '10s' | 'infinite'>('once')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Standard Snapchat lenses list
  const lenses: Lens[] = [
    { id: 'none', name: 'Original', icon: '📷', color: 'bg-zinc-700 border-white', filterClass: '' },
    { id: 'cyberpunk', name: 'Cyber Neon', icon: '🌌', color: 'bg-gradient-to-tr from-pink-500 to-purple-600 border-pink-400', filterClass: 'hue-rotate-[280deg] saturate-[2.2] contrast-[1.2]' },
    { id: 'vintage', name: 'Retro Sepia', icon: '🎞️', color: 'bg-gradient-to-tr from-amber-600 to-amber-800 border-amber-500', filterClass: 'sepia-[0.75] contrast-[0.9] brightness-[0.95]' },
    { id: 'beauty', name: 'Soft Glow', icon: '✨', color: 'bg-gradient-to-tr from-rose-400 to-teal-400 border-white/60', filterClass: 'brightness-[1.1] saturate-[1.15] contrast-[0.95] blur-[0.2px]' },
    { id: 'noir', name: 'Noir B&W', icon: '🕶️', color: 'bg-gradient-to-tr from-zinc-900 to-zinc-600 border-black', filterClass: 'grayscale-[1] contrast-[1.4] brightness-[0.9]' }
  ]

  // Start webcam stream
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.warn("Webcam access declined or unavailable, falling back to mock portrait stream.", err)
      }
    }

    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Trigger Flash effect
  const triggerFlashEffect = () => {
    setFlash(true)
    setTimeout(() => setFlash(false), 250)
  }

  // Handle shutter snap capture
  const handleCapture = () => {
    if (timer > 0) {
      setCountdown(timer)
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null
          if (prev <= 1) {
            clearInterval(interval)
            snapPhoto()
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      snapPhoto()
    }
  }

  const snapPhoto = () => {
    setIsCapturing(true)
    triggerFlashEffect()

    setTimeout(() => {
      if (stream && videoRef.current && canvasRef.current) {
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Flip context horizontally to mimic mirror feed
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // Apply matching filter programmatically on the context
          const lensInfo = lenses.find(l => l.id === activeLens)
          if (lensInfo?.id === 'cyberpunk') {
            ctx.filter = 'hue-rotate(280deg) saturate(2) contrast(1.2)'
          } else if (lensInfo?.id === 'vintage') {
            ctx.filter = 'sepia(0.7) contrast(0.9) brightness(0.95)'
          } else if (lensInfo?.id === 'beauty') {
            ctx.filter = 'brightness(1.1) saturate(1.1) contrast(0.95)'
          } else if (lensInfo?.id === 'noir') {
            ctx.filter = 'grayscale(1) contrast(1.3) brightness(0.9)'
          }
          
          // Redraw with filter
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          const dataUrl = canvas.toDataURL('image/jpeg')
          setCapturedImage(dataUrl)
        }
      } else {
        // Fallback Mock capture if webcam not active
        const simulatedImages: Record<LensFilter, string> = {
          none: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=1000&q=80',
          cyberpunk: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&h=1000&q=80',
          vintage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=1000&q=80',
          beauty: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&h=1000&q=80',
          noir: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=1000&q=80'
        }
        setCapturedImage(simulatedImages[activeLens])
      }
      setIsCapturing(false)
    }, 400)
  }

  // Save/Download Captured Snap
  const handleSaveLocally = () => {
    if (!capturedImage) return
    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `Nova_Snap_${Date.now()}.jpg`
    link.click()
  }

  // Upload to public Stories
  const handlePostToStories = async () => {
    if (!user || !capturedImage) return
    setIsCapturing(true)
    
    // Simulate uploading base64 data to Supabase Stories table
    const { error } = await supabase.from('stories').insert({
      user_id: user.id,
      media_url: capturedImage, // In real-world, we'd convert base64 to file and upload to bucket, but raw dataURL fits fine as a proof of concept!
      media_type: 'image',
      caption: `Captured on Nova Camera with ${lenses.find(l => l.id === activeLens)?.name} lens! 🚀📸`,
      bg_color: 'linear-gradient(to top, #182848, #4b6cb7)'
    })

    setIsCapturing(false)
    if (!error) {
      setShareSuccess(true)
      setTimeout(() => {
        setShareSuccess(false)
        setCapturedImage(null)
      }, 1500)
    }
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-black text-white flex flex-col items-center justify-center">
      {/* SHUTTER WHITE FLASH OVERLAY */}
      <AnimatePresence>
        {flash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* CAMERA SCREEN VIEWPORT */}
      <div className="w-full h-full relative max-w-md bg-zinc-950 aspect-[9/16] shadow-2xl flex items-center justify-center overflow-hidden border border-white/5 md:rounded-3xl my-auto">
        
        {/* WEBCAM VIDEO STREAM */}
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className={`w-full h-full object-cover scale-x-[-1] transition-all duration-300 ${
              lenses.find(l => l.id === activeLens)?.filterClass
            }`}
          />
        ) : (
          /* GLORIOUS FALLBACK PREVIEW IF CAM IS OFF */
          <div className="w-full h-full relative flex items-center justify-center bg-zinc-950">
            <img 
              src={
                activeLens === 'none' ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&h=1000&q=80' :
                activeLens === 'cyberpunk' ? 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&h=1000&q=80' :
                activeLens === 'vintage' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=1000&q=80' :
                activeLens === 'beauty' ? 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&h=1000&q=80' :
                'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&h=1000&q=80'
              } 
              alt="Mock Stream" 
              className={`w-full h-full object-cover opacity-60 transition-all duration-500 ${
                lenses.find(l => l.id === activeLens)?.filterClass
              }`}
            />
            {/* Visual indicator of mock mode */}
            <div className="absolute top-16 left-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 animate-bounce" />
              <span>Mock Camera Mode active</span>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* --- DYNAMIC CAM CONTROLS (Only when not captured) --- */}
        {!capturedImage && (
          <>
            {/* TOP NAVIGATION ACTIONS */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <Link 
                href="/map"
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              </Link>

              {/* Header category lens label */}
              <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>{lenses.find(l => l.id === activeLens)?.name} Lens</span>
              </div>

              {/* Rotate mock action */}
              <button 
                onClick={() => {
                  triggerFlashEffect()
                  setActiveLens('none')
                }}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* RIGHT SIDE VERTICAL PARAMETERS PANEL */}
            <div className="absolute right-4 top-20 flex flex-col gap-3 z-10">
              {/* Flash trigger indicator */}
              <button 
                onClick={() => triggerFlashEffect()}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition"
              >
                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </button>

              {/* Countdown self timer */}
              <button 
                onClick={() => setTimer(t => t === 0 ? 3 : t === 3 ? 5 : 0)}
                className={`w-10 h-10 rounded-full backdrop-blur-md border flex flex-col items-center justify-center transition-all ${
                  timer > 0 
                    ? 'bg-yellow-500 border-yellow-500 text-black font-extrabold' 
                    : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                }`}
              >
                <Timer className="w-4 h-4" />
                {timer > 0 && <span className="text-[9px] -mt-0.5 leading-none">{timer}s</span>}
              </button>

              {/* View once duration indicator */}
              <button 
                onClick={() => setDuration(d => d === 'once' ? '3s' : d === '3s' ? '10s' : d === '10s' ? 'infinite' : 'once')}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center hover:bg-black/60 transition text-[9px] font-extrabold text-zinc-300"
              >
                <Eye className="w-3.5 h-3.5 mb-0.5 text-zinc-100" />
                <span className="capitalize leading-none">{duration}</span>
              </button>
            </div>

            {/* COUNTDOWN TEXT TIMER OVERLAY */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute inset-0 bg-yellow-500/10 flex items-center justify-center z-20 pointer-events-none"
                >
                  <span className="text-8xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                    {countdown}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTTOM SHUTTER TRIGGER & FILTER SELECTOR BAR */}
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-5 z-10 px-4">
              
              {/* Filter Circles Selector */}
              <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/5 overflow-x-auto max-w-full no-scrollbar">
                {lenses.map((lens) => (
                  <button
                    key={lens.id}
                    onClick={() => setActiveLens(lens.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 shrink-0 transition-all ${
                      activeLens === lens.id 
                        ? 'scale-110 shadow-lg border-yellow-400 ring-2 ring-yellow-400/20' 
                        : 'border-white/20 hover:border-white/60'
                    } ${lens.color}`}
                  >
                    <span>{lens.icon}</span>
                  </button>
                ))}
              </div>

              {/* Shutter capture button */}
              <button 
                onClick={handleCapture}
                disabled={isCapturing}
                className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition duration-200 shrink-0"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-6 h-6 text-black stroke-[2.5]" />
                </div>
              </button>
            </div>
          </>
        )}

        {/* --- PREVIEW AND SHARE FRAME (Only when captured) --- */}
        <AnimatePresence>
          {capturedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-30 flex flex-col justify-between"
            >
              {/* Fullscreen captured frame */}
              <img 
                src={capturedImage} 
                alt="Captured snap" 
                className="w-full h-full object-cover"
              />

              {/* Captured story details caption label */}
              <div className="absolute bottom-20 left-4 right-4 bg-zinc-950/70 border border-white/10 rounded-2xl p-3 backdrop-blur-md flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Active Filter</span>
                  <span className="text-sm font-semibold text-white mt-0.5">
                    {lenses.find(l => l.id === activeLens)?.name} Lens
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                  <Eye className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="capitalize">{duration} view</span>
                </div>
              </div>

              {/* Top back/clear button */}
              <button 
                onClick={() => setCapturedImage(null)}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-black/80 transition z-40"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* BOTTOM ACTIONS BAR */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-40">
                <button 
                  onClick={handleSaveLocally}
                  className="flex items-center gap-2 bg-black/60 hover:bg-black/80 border border-white/10 px-4 py-2.5 rounded-2xl font-semibold text-xs transition"
                >
                  <Download className="w-4 h-4 text-zinc-200" />
                  <span>Save Snap</span>
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={handlePostToStories}
                    disabled={isCapturing}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 font-bold text-xs px-4 py-2.5 rounded-2xl transition disabled:opacity-50"
                  >
                    {isCapturing ? (
                      <span>Posting...</span>
                    ) : (
                      <>
                        <Smile className="w-4 h-4" />
                        <span>Post Story</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-2xl transition shadow-lg shadow-yellow-500/20"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>Send To</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SHARE MODAL */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 z-50 flex items-end"
            >
              <motion.div 
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                exit={{ y: 200 }}
                className="w-full bg-zinc-900 border-t border-white/10 rounded-t-3xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">Send Snap To</span>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="p-1 rounded-full hover:bg-white/5 text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick list of seed users */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {[
                    { id: '33333333-3333-3333-3333-333333333333', name: 'Marcus Tech', user: 'marcus_tech', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
                    { id: '11111111-1111-1111-1111-111111111111', name: 'Alex Travels', user: 'alex_travels', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80' },
                    { id: '22222222-2222-2222-2222-222222222222', name: 'Sophia Style', user: 'sophia_style', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80' }
                  ].map(friend => (
                    <div 
                      key={friend.id}
                      onClick={async () => {
                        if (!user || !capturedImage) return
                        setShowShareModal(false)
                        setIsCapturing(true)
                        
                        // Insert direct chat message referencing simulated snap URL
                        const { error } = await supabase.from('messages').insert({
                          chat_id: 'da111111-1111-1111-1111-111111111111', // default chat shared with Marcus
                          sender_id: user.id,
                          content: 'Sent a Snap! 📸👻',
                          media_url: capturedImage,
                          media_type: 'image'
                        })
                        
                        setIsCapturing(false)
                        if (!error) {
                          setShareSuccess(true)
                          setTimeout(() => {
                            setShareSuccess(false)
                            setCapturedImage(null)
                          }, 1500)
                        }
                      }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5"
                    >
                      <img src={friend.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{friend.name}</p>
                        <p className="text-xs text-zinc-500 truncate">@{friend.user}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Send className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUCCESS NOTIFICATION */}
        <AnimatePresence>
          {shareSuccess && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 m-auto w-40 h-40 bg-zinc-900/90 border border-green-500/20 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center gap-2.5 z-50 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <Check className="w-6 h-6 text-green-400 stroke-[3]" />
              </div>
              <span className="font-bold text-sm text-green-400">Snap Sent!</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
