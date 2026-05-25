'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  src: string
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

function formatRemaining(secs: number): string {
  if (secs <= 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
}

const LIMIT_KEY  = 'screenTimeLimit'
const periodKey  = () => {
  const now  = new Date()
  const half = now.getHours() >= 12 ? 'pm' : 'am'
  return `screenTimeUsed_${now.toISOString().slice(0, 10)}_${half}`
}

const LIMIT_OPTIONS = [
  { label: '30 min',  mins: 30  },
  { label: '1 hour',  mins: 60  },
  { label: '1.5 hrs', mins: 90  },
  { label: '2 hours', mins: 120 },
]

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
    const move      = (e: MouseEvent)     => { if (dragging.current) onSeek(getFrac(e.clientX)) }
    const up        = ()                  => { dragging.current = false }
    const touchMove = (e: TouchEvent)     => { if (dragging.current) { e.preventDefault(); onSeek(getFrac(e.touches[0].clientX)) } }
    const touchEnd  = ()                  => { dragging.current = false }
    window.addEventListener('mousemove',  move)
    window.addEventListener('mouseup',    up)
    window.addEventListener('touchmove',  touchMove, { passive: false })
    window.addEventListener('touchend',   touchEnd)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('touchend',  touchEnd)
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
      onTouchStart={(e) => { dragging.current = true; onSeek(getFrac(e.touches[0].clientX)) }}
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

export default function VideoPlayer({ src, title, onClose }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null)

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
  const [needsTap,     setNeedsTap]     = useState(false)
  const [videoError,   setVideoError]   = useState<string | null>(null)

  // Screen time
  const [limitMins,        setLimitMins]        = useState<number | null>(null)
  const [usedSecs,         setUsedSecs]         = useState(0)
  const [limitReached,     setLimitReached]     = useState(false)
  const [showWarning,      setShowWarning]      = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [showLimitPanel,   setShowLimitPanel]   = useState(false)
  const [codeInput,        setCodeInput]        = useState('')
  const [codeAccepted,     setCodeAccepted]     = useState(false)
  const [codeError,        setCodeError]        = useState(false)

  // Panel unlock (separate from limit-reached code)
  const [panelCode,     setPanelCode]     = useState('')
  const [panelUnlocked, setPanelUnlocked] = useState(false)
  const [panelCodeErr,  setPanelCodeErr]  = useState(false)

  // Load from localStorage on mount — default to 30 min always
  useEffect(() => {
    const stored = localStorage.getItem(LIMIT_KEY)
    const limit  = stored ? parseInt(stored, 10) : 30
    if (!stored) localStorage.setItem(LIMIT_KEY, '30')
    const used   = parseInt(localStorage.getItem(periodKey()) ?? '0', 10)
    setLimitMins(limit)
    setUsedSecs(used)
    if (used >= limit * 60) setLimitReached(true)
  }, [])

  const resetCodeState = useCallback(() => {
    setCodeInput('')
    setCodeAccepted(false)
    setCodeError(false)
  }, [])

  const applyLimit = useCallback((mins: number | null) => {
    if (mins === null) localStorage.removeItem(LIMIT_KEY)
    else               localStorage.setItem(LIMIT_KEY, String(mins))
    setLimitMins(mins)
    setLimitReached(false)
    setShowWarning(false)
    setWarningDismissed(false)
    setShowLimitPanel(false)
    setPanelCode('')
    setPanelUnlocked(false)
    setPanelCodeErr(false)
    resetCodeState()
  }, [resetCodeState])

  const submitPanelCode = useCallback(() => {
    if (panelCode === '9006') {
      setPanelUnlocked(true)
      setPanelCodeErr(false)
    } else {
      setPanelCodeErr(true)
      setPanelCode('')
      setTimeout(() => setPanelCodeErr(false), 600)
    }
  }, [panelCode])

  const submitCode = useCallback(() => {
    if (codeInput === '9006') {
      setCodeAccepted(true)
      setCodeError(false)
    } else {
      setCodeError(true)
      setCodeInput('')
      setTimeout(() => setCodeError(false), 600)
    }
  }, [codeInput])

  const addTime = useCallback((mins: number) => {
    setLimitMins(prev => {
      const next = (prev ?? 0) + mins
      localStorage.setItem(LIMIT_KEY, String(next))
      return next
    })
    setLimitReached(false)
    setShowWarning(false)
    setWarningDismissed(false)
    resetCodeState()
    setTimeout(() => videoRef.current?.play().catch(() => {}), 50)
  }, [resetCodeState])

  const unlock = useCallback(() => {
    localStorage.removeItem(LIMIT_KEY)
    setLimitMins(null)
    setLimitReached(false)
    setShowWarning(false)
    setWarningDismissed(false)
    resetCodeState()
    setTimeout(() => videoRef.current?.play().catch(() => {}), 50)
  }, [resetCodeState])

  // Tick every second while playing
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (!playing || limitReached) return
    tickRef.current = setInterval(() => {
      setUsedSecs(prev => {
        const next = prev + 1
        localStorage.setItem(periodKey(), String(next))
        return next
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [playing, limitReached])

  // Check limit / warning whenever usedSecs changes
  useEffect(() => {
    if (limitMins === null) return
    const remaining = limitMins * 60 - usedSecs
    if (remaining <= 0 && !limitReached) {
      videoRef.current?.pause()
      setLimitReached(true)
      setShowWarning(false)
    } else if (remaining <= 300 && remaining > 0 && !warningDismissed && !showWarning) {
      setShowWarning(true)
    }
  }, [usedSecs, limitMins, limitReached, warningDismissed, showWarning])

  const remainingSecs = limitMins !== null ? Math.max(0, limitMins * 60 - usedSecs) : null
  const nearLimit     = remainingSecs !== null && remainingSecs <= 300

  const resetTimer = useCallback(() => {
    setShowControls(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || limitReached) return
    v.paused ? v.play() : v.pause()
  }, [limitReached])

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
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else                              document.exitFullscreen()
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
        case 'Escape':     if (!limitReached) onClose(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, seek, toggleFullscreen, onClose, limitReached])

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

    const onPlay         = () => { setPlaying(true); setNeedsTap(false); resetTimer() }
    const onPause        = () => setPlaying(false)
    const onTimeUpdate   = () => {
      setCurrentTime(v.currentTime)
      if (v.duration) setProgress(v.currentTime / v.duration)
    }
    const onDuration     = () => setDuration(v.duration)
    const onProgress     = () => {
      if (v.buffered.length > 0 && v.duration)
        setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration)
    }
    const onWaiting      = () => setLoading(true)
    const onCanPlay      = () => {
      setLoading(false)
      if (!limitReached) v.play().catch(() => setNeedsTap(true))
    }
    const onError        = () => {
      setLoading(false)
      const code = v.error?.code
      setVideoError(code === 4 ? 'Format not supported on this device' : 'Failed to load video')
    }
    const onVolumeChange = () => { setVolume(v.volume); setMuted(v.muted) }

    v.addEventListener('play',           onPlay)
    v.addEventListener('pause',          onPause)
    v.addEventListener('timeupdate',     onTimeUpdate)
    v.addEventListener('durationchange', onDuration)
    v.addEventListener('progress',       onProgress)
    v.addEventListener('waiting',        onWaiting)
    v.addEventListener('canplay',        onCanPlay)
    v.addEventListener('error',          onError)
    v.addEventListener('volumechange',   onVolumeChange)

    return () => {
      v.removeEventListener('play',           onPlay)
      v.removeEventListener('pause',          onPause)
      v.removeEventListener('timeupdate',     onTimeUpdate)
      v.removeEventListener('durationchange', onDuration)
      v.removeEventListener('progress',       onProgress)
      v.removeEventListener('waiting',        onWaiting)
      v.removeEventListener('canplay',        onCanPlay)
      v.removeEventListener('error',          onError)
      v.removeEventListener('volumechange',   onVolumeChange)
    }
  }, [resetTimer, limitReached])

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
      onTouchStart={resetTimer}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onClick={limitReached ? undefined : togglePlay}
        preload="metadata"
        playsInline
      />

      {/* Loading spinner */}
      {loading && !limitReached && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Tap to play (iOS autoplay blocked) */}
      {needsTap && !limitReached && !videoError && (
        <button
          className="absolute inset-0 flex items-center justify-center"
          onClick={() => { videoRef.current?.play().catch(() => {}); setNeedsTap(false) }}
          aria-label="Tap to play"
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          >
            ▶
          </div>
        </button>
      )}

      {/* Video error */}
      {videoError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none px-8 text-center">
          <span className="text-5xl">⚠️</span>
          <p className="text-white font-bold">{videoError}</p>
          <p className="text-white/40 text-sm">Try a different video or format</p>
        </div>
      )}

      {/* ── 5-minute warning banner ── */}
      {showWarning && !limitReached && (
        <div
          className="absolute top-0 left-0 right-0 z-[220] flex items-center justify-between px-6 py-3"
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-white font-black text-sm">Screen Time Warning</p>
              <p className="text-white/90 text-xs">
                {remainingSecs !== null ? formatRemaining(remainingSecs) : '5 min'} remaining — your limit is almost up!
              </p>
            </div>
          </div>
          <button
            onClick={() => { setShowWarning(false); setWarningDismissed(true) }}
            className="text-white/80 hover:text-white text-xl hover:scale-110 transition-all leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Limit reached overlay ── */}
      {limitReached && (
        <div className="absolute inset-0 z-[220] bg-black/85 backdrop-blur-sm flex items-center justify-center px-6">
          <div
            className="rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(124,58,237,0.4)',
            }}
          >
            <div className="text-6xl mb-4">⏱️</div>
            <h2 className="text-white text-2xl font-black mb-2 leading-tight">
              Your Screen Time Limit<br />has been reached.
            </h2>

            {!codeAccepted ? (
              <>
                <p className="text-white/45 text-sm mt-3 mb-5">Enter your code to continue</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={codeInput}
                    onChange={e => { setCodeInput(e.target.value.replace(/\D/g, '')); setCodeError(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') submitCode() }}
                    placeholder="••••"
                    autoFocus
                    className="flex-1 py-3 px-4 rounded-xl font-black text-center text-white text-lg tracking-widest outline-none transition-all"
                    style={{
                      background: codeError ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                      border: codeError ? '2px solid rgba(239,68,68,0.7)' : '2px solid rgba(124,58,237,0.35)',
                      animation: codeError ? 'shake 0.4s ease' : 'none',
                    }}
                  />
                  <button
                    onClick={submitCode}
                    className="py-3 px-5 rounded-xl font-black text-white text-sm hover:scale-105 active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    OK
                  </button>
                </div>
                {codeError && (
                  <p className="text-red-400 text-xs mb-1">Incorrect code</p>
                )}
                <button
                  onClick={onClose}
                  className="mt-4 w-full py-2 text-xs transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                >
                  Close
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={() => addTime(15)}
                  className="w-full py-3 rounded-xl font-black text-white text-base hover:scale-105 active:scale-95 transition-transform shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                >
                  ＋ Add 15 Minutes
                </button>
                <button
                  onClick={unlock}
                  className="w-full py-3 rounded-xl font-black text-base hover:scale-105 active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                >
                  🔓 Unlock
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Screen time limit settings panel ── */}
      {showLimitPanel && (
        <div
          className="absolute inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
          onClick={() => { setShowLimitPanel(false); setPanelCode(''); setPanelUnlocked(false); setPanelCodeErr(false) }}
        >
          <div
            className="rounded-3xl p-6 max-w-xs w-full shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '1px solid rgba(124,58,237,0.4)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-black text-lg">⏱ Screen Time Limit</h3>
              <button
                onClick={() => { setShowLimitPanel(false); setPanelCode(''); setPanelUnlocked(false); setPanelCodeErr(false) }}
                className="text-white/50 hover:text-white text-xl transition-colors leading-none"
              >✕</button>
            </div>
            <p className="text-white/40 text-xs mb-5">
              This period: {formatRemaining(usedSecs)} watched
              {remainingSecs !== null && <> · {formatRemaining(remainingSecs)} remaining</>}
            </p>

            {!panelUnlocked ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4 py-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <span className="text-xl">🔒</span>
                  <span className="text-white font-black">{limitMins ?? 30} min limit</span>
                </div>
                <p className="text-white/40 text-xs text-center mb-3">Enter code to change limit</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={panelCode}
                    onChange={e => { setPanelCode(e.target.value.replace(/\D/g, '')); setPanelCodeErr(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') submitPanelCode() }}
                    placeholder="••••"
                    className="flex-1 py-3 px-4 rounded-xl font-black text-center text-white text-lg tracking-widest outline-none transition-all"
                    style={{
                      background: panelCodeErr ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                      border: panelCodeErr ? '2px solid rgba(239,68,68,0.7)' : '2px solid rgba(124,58,237,0.35)',
                      animation: panelCodeErr ? 'shake 0.4s ease' : 'none',
                    }}
                  />
                  <button
                    onClick={submitPanelCode}
                    className="py-3 px-5 rounded-xl font-black text-white text-sm hover:scale-105 active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    OK
                  </button>
                </div>
                {panelCodeErr && <p className="text-red-400 text-xs text-center">Incorrect code</p>}
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {LIMIT_OPTIONS.map(opt => (
                    <button
                      key={opt.mins}
                      onClick={() => applyLimit(opt.mins)}
                      className="py-3 rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95"
                      style={
                        limitMins === opt.mins
                          ? { background: 'linear-gradient(135deg, #7C3AED, #EC4899)', color: 'white' }
                          : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => applyLimit(null)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Remove Limit
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity:       showControls && !limitReached ? 1 : 0,
          pointerEvents: showControls && !limitReached ? 'auto' : 'none',
        }}
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

        {/* Center play/pause */}
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

        {/* Bottom controls */}
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
              onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted } }}
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

            {/* Screen time button */}
            <button
              onClick={() => setShowLimitPanel(true)}
              className="flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 hover:scale-105 transition-all"
              style={
                nearLimit
                  ? { background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: 'white' }
                  : limitMins !== null
                    ? { background: 'rgba(124,58,237,0.4)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }
              }
              aria-label="Screen time settings"
            >
              ⏱
              {remainingSecs !== null && (
                <span className="tabular-nums">{formatRemaining(remainingSecs)}</span>
              )}
            </button>

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
