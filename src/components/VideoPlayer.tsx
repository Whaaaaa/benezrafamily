'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  videoId: string
  title: string
  onClose: () => void
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function SeekBar({
  progress,
  buffered,
  onSeek,
}: {
  progress: number
  buffered: number
  onSeek: (frac: number) => void
}) {
  const barRef   = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [hovered, setHovered] = useState(false)

  const getFrac = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragging.current) onSeek(getFrac(e.clientX)) }
    const up   = () => { dragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
    }
  }, [getFrac, onSeek])

  return (
    <div
      ref={barRef}
      className="relative rounded-full cursor-pointer"
      style={{ height: hovered ? 6 : 4, background: 'rgba(255,255,255,0.2)', transition: 'height 0.15s ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => { dragging.current = true; onSeek(getFrac(e.clientX)) }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${buffered * 100}%`, background: 'rgba(255,255,255,0.3)' }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg, #7C3AED, #EC4899)' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg pointer-events-none"
        style={{
          left:    `calc(${progress * 100}% - ${hovered ? 7 : 5}px)`,
          width:   hovered ? 14 : 10,
          height:  hovered ? 14 : 10,
          opacity: hovered ? 1 : 0.6,
          transition: 'all 0.15s ease',
        }}
      />
    </div>
  )
}

export default function VideoPlayer({ videoId, title, onClose }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing,      setPlaying]      = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [buffered,     setBuffered]     = useState(0)
  const [muted,        setMuted]        = useState(false)
  const [volume,       setVolume]       = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading,      setLoading]      = useState(true)

  const resetTimer = useCallback(() => {
    setShowControls(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play() : v.pause()
  }, [])

  const seek = useCallback((delta: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta))
  }, [])

  const handleSeek = useCallback((frac: number) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    v.currentTime = frac * v.duration
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      switch (e.code) {
        case 'Space':      e.preventDefault(); togglePlay(); break
        case 'ArrowLeft':  seek(-10); break
        case 'ArrowRight': seek(10);  break
        case 'ArrowUp':    e.preventDefault(); { const v = videoRef.current; if (v) { v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume) } } break
        case 'ArrowDown':  e.preventDefault(); { const v = videoRef.current; if (v) { v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume) } } break
        case 'KeyF':       toggleFullscreen(); break
        case 'KeyM':       { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } } break
        case 'Escape':     onClose(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, seek, toggleFullscreen, onClose])

  // Fullscreen change tracking
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Video events
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onPlay       = () => { setPlaying(true); resetTimer() }
    const onPause      = () => setPlaying(false)
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime)
      if (v.duration) setProgress(v.currentTime / v.duration)
    }
    const onDuration = () => setDuration(v.duration)
    const onProgress = () => {
      if (v.buffered.length > 0 && v.duration)
        setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration)
    }
    const onWaiting  = () => setLoading(true)
    const onCanPlay  = () => { setLoading(false); v.play().catch(() => {}) }
    const onVolumeChange = () => { setVolume(v.volume); setMuted(v.muted) }

    v.addEventListener('play',          onPlay)
    v.addEventListener('pause',         onPause)
    v.addEventListener('timeupdate',    onTimeUpdate)
    v.addEventListener('durationchange',onDuration)
    v.addEventListener('progress',      onProgress)
    v.addEventListener('waiting',       onWaiting)
    v.addEventListener('canplay',       onCanPlay)
    v.addEventListener('volumechange',  onVolumeChange)

    return () => {
      v.removeEventListener('play',          onPlay)
      v.removeEventListener('pause',         onPause)
      v.removeEventListener('timeupdate',    onTimeUpdate)
      v.removeEventListener('durationchange',onDuration)
      v.removeEventListener('progress',      onProgress)
      v.removeEventListener('waiting',       onWaiting)
      v.removeEventListener('canplay',       onCanPlay)
      v.removeEventListener('volumechange',  onVolumeChange)
    }
  }, [resetTimer])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [resetTimer])

  const volumeIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center select-none"
      onMouseMove={resetTimer}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={`/api/video?id=${videoId}`}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        preload="metadata"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none' }}
      >
        {/* Top gradient + title */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent flex items-start justify-between px-6 sm:px-10 pt-5">
          <h2 className="text-white text-lg sm:text-xl font-black truncate pr-4 drop-shadow">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl hover:scale-110 transition-all flex-shrink-0 leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Center play/pause on click feedback */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!playing && !loading && (
            <div
              className="text-white text-7xl opacity-70 drop-shadow-2xl"
              onClick={togglePlay}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            >
              ▶
            </div>
          )}
        </div>

        {/* Bottom gradient + controls */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 pb-6 pt-20 bg-gradient-to-t from-black/90 to-transparent">
          <SeekBar progress={progress} buffered={buffered} onSeek={handleSeek} />

          <div className="flex items-center gap-3 sm:gap-4 mt-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white text-2xl hover:scale-110 transition-transform"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? '⏸' : '▶'}
            </button>

            {/* Back 10s */}
            <button
              onClick={() => seek(-10)}
              className="text-white/80 hover:text-white text-xs font-black hover:scale-110 transition-all border border-white/30 rounded-full px-2 py-0.5"
            >
              −10s
            </button>

            {/* Forward 10s */}
            <button
              onClick={() => seek(10)}
              className="text-white/80 hover:text-white text-xs font-black hover:scale-110 transition-all border border-white/30 rounded-full px-2 py-0.5"
            >
              +10s
            </button>

            {/* Volume */}
            <button
              onClick={() => {
                const v = videoRef.current
                if (v) { v.muted = !v.muted }
              }}
              className="text-lg hover:scale-110 transition-transform"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {volumeIcon}
            </button>

            {/* Time display */}
            <span className="text-white/70 text-xs sm:text-sm font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white/80 hover:text-white hover:scale-110 transition-all"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
