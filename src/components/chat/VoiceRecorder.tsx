'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Send, Check } from 'lucide-react'

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void
  onCancel: () => void
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [seconds, setSeconds] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    startRecording()
    return () => {
      stopTracksAndTimer()
    }
  }, [])

  const stopTracksAndTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close()
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioChunksRef.current.length > 0) {
          onSend(audioBlob)
        }
      }

      mediaRecorder.start(200)
      setIsRecording(true)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1)
      }, 1000)

      // Setup audio visualizer
      setupVisualizer(stream)
    } catch (err: any) {
      console.error('Error starting audio recording:', err)
      setError('Microphone permission denied or unsupported')
      // Pulsing fallback animation will run
    }
  }

  const setupVisualizer = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const audioCtx = new AudioContextClass()
      audioCtxRef.current = audioCtx

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      sourceRef.current = source
      source.connect(analyser)

      drawWaveform()
    } catch (e) {
      console.error('Could not set up analyser:', e)
    }
  }

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!canvasRef.current) return
      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const width = canvas.width
      const height = canvas.height
      const barWidth = (width / bufferLength) * 1.5
      let barHeight
      let x = 0

      // Premium visualizer: double sided wave symmetric around vertical center
      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.8
        if (barHeight < 4) barHeight = 4

        // Purple-blue glowing gradient
        const gradient = ctx.createLinearGradient(0, height / 2 - barHeight / 2, 0, height / 2 + barHeight / 2)
        gradient.addColorStop(0, '#a855f7') // Purple
        gradient.addColorStop(0.5, '#3b82f6') // Blue
        gradient.addColorStop(1, '#a855f7')

        ctx.fillStyle = gradient
        
        // Draw rounded rect bar
        const yPos = height / 2 - barHeight / 2
        ctx.beginPath()
        ctx.roundRect(x, yPos, barWidth - 2, barHeight, 3)
        ctx.fill()

        x += barWidth
      }
    }

    draw()
  }

  const handleStopAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      stopTracksAndTimer()
    } else {
      // If we errored/no mic, let's just trigger cancel
      onCancel()
    }
  }

  const handleCancel = () => {
    stopTracksAndTimer()
    onCancel()
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 w-full bg-zinc-900/90 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-2xl shadow-2xl">
      {/* Recording dot indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
        />
        <span className="text-white text-xs font-bold font-mono min-w-[42px]">
          {formatTime(seconds)}
        </span>
      </div>

      {/* Visualizer Area */}
      <div className="flex-1 h-10 relative overflow-hidden flex items-center justify-center">
        {error ? (
          <span className="text-zinc-500 text-xs italic">{error}</span>
        ) : streamRef.current ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={320}
            height={40}
          />
        ) : (
          /* Pulsing mockup wave while starting / fallback */
          <div className="flex items-center gap-1 w-full justify-center">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  height: [8, Math.floor(Math.random() * 24) + 8, 8],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6 + Math.random() * 0.4,
                  delay: i * 0.03,
                }}
                className="w-1 rounded bg-gradient-to-t from-purple-500 to-blue-500 opacity-60"
                style={{ height: '8px' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="p-2 rounded-full text-zinc-400 hover:text-red-400 hover:bg-white/5 transition"
          title="Cancel recording"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Send / Apply Button */}
        <button
          onClick={handleStopAndSend}
          className="p-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 transition"
          title="Send voice note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
