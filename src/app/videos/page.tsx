'use client'

import { useEffect, useState, useRef } from 'react'
import VideoPlayer from '@/components/VideoPlayer'

interface VideoMeta {
  id: string
  title: string
  category: string
  hasThumbnail: boolean
  size: number
  mtime: number
}

const GRADIENTS = [
  'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #7C3AED 100%)',
  'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #F59E0B 100%)',
]

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0 }
  return Math.abs(h)
}

function formatSize(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function VideoCard({ video, onPlay }: { video: VideoMeta; onPlay: () => void }) {
  const gradient = GRADIENTS[hashCode(video.title) % GRADIENTS.length]
  return (
    <div
      onClick={onPlay}
      className="relative flex-shrink-0 w-44 sm:w-52 cursor-pointer group transition-all duration-200 hover:scale-105 hover:z-10"
    >
      <div className="relative rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
        {video.hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/video?id=${video.id}&thumb=1`}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: gradient }}>
            🎬
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex items-center justify-center">
          <span className="text-white text-5xl opacity-0 group-hover:opacity-100 transition-all duration-200 drop-shadow-2xl scale-75 group-hover:scale-100">
            ▶
          </span>
        </div>
      </div>
      <p className="mt-2 text-white text-sm font-bold truncate">{video.title}</p>
      <p className="text-gray-500 text-xs">{formatSize(video.size)}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-44 sm:w-52 animate-pulse">
      <div className="rounded-xl bg-white/10" style={{ aspectRatio: '16/9' }} />
      <div className="mt-2 h-3 bg-white/10 rounded w-3/4" />
      <div className="mt-1 h-2 bg-white/10 rounded w-1/2" />
    </div>
  )
}

function ScrollRow({ videos, onPlay }: { videos: VideoMeta[]; onPlay: (v: VideoMeta) => void }) {
  const rowRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: -1 | 1) => {
    rowRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' })
  }

  return (
    <div className="relative group/row">
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-0 bottom-6 z-10 w-10 bg-gradient-to-r from-[#141414] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        aria-label="Scroll left"
      >
        <span className="text-white text-xl font-black">‹</span>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-0 bottom-6 z-10 w-10 bg-gradient-to-l from-[#141414] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200"
        aria-label="Scroll right"
      >
        <span className="text-white text-xl font-black">›</span>
      </button>

      <div
        ref={rowRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 video-row-scroll"
      >
        {videos.map(v => (
          <VideoCard key={v.id} video={v} onPlay={() => onPlay(v)} />
        ))}
      </div>
    </div>
  )
}

export default function VideosPage() {
  const [videos,  setVideos]  = useState<VideoMeta[] | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [playing, setPlaying] = useState<VideoMeta | null>(null)

  useEffect(() => {
    fetch('/api/videos')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setVideos(data)
      })
      .catch(e => setError(String(e.message)))
  }, [])

  const byCategory: Record<string, VideoMeta[]> | null = videos
    ? videos.reduce<Record<string, VideoMeta[]>>((acc, v) => {
        ;(acc[v.category] ??= []).push(v)
        return acc
      }, {})
    : null

  // Sort categories: non-Library first, Library last
  const categories = byCategory
    ? Object.keys(byCategory).sort((a, b) => {
        if (a === 'Library') return 1
        if (b === 'Library') return -1
        return a.localeCompare(b)
      })
    : []

  const hero = videos?.[0] ?? null
  const heroGradient = hero ? GRADIENTS[hashCode(hero.title) % GRADIENTS.length] : GRADIENTS[0]

  return (
    <>
      {playing && (
        <VideoPlayer
          videoId={playing.id}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}

      <div className="min-h-screen bg-[#141414] text-white animate-fade-in">

        {/* ── Error state ── */}
        {error && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 px-6 text-center">
            <span className="text-6xl animate-float">📺</span>
            <h2 className="text-2xl font-black">Video Streaming is Local-Only</h2>
            <p className="text-gray-400 max-w-md leading-relaxed">
              {error.includes('VIDEO_DIR') ? (
                <>
                  This feature streams videos directly from your home computer to any device on your network.
                  To use it, run the app locally and set{' '}
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-purple-300">VIDEO_DIR</code>
                  {' '}in{' '}
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-purple-300">.env.local</code>
                  {' '}to your videos folder.
                </>
              ) : error}
            </p>
            <div
              className="text-xs text-gray-600 border border-white/10 rounded-xl px-4 py-3 max-w-xs"
            >
              💡 On your home network, visit this page at{' '}
              <span className="text-purple-400 font-mono">http://YOUR-PC-IP:3000/videos</span>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {!error && !videos && (
          <>
            <div className="w-full bg-white/5 animate-pulse" style={{ height: '56vh', minHeight: 280 }} />
            <div className="px-6 sm:px-12 py-10 space-y-10">
              {[1, 2].map(i => (
                <div key={i}>
                  <div className="h-5 bg-white/10 rounded w-36 mb-4 animate-pulse" />
                  <div className="flex gap-4">
                    {Array.from({ length: 5 }).map((_, j) => <SkeletonCard key={j} />)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {videos?.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <span className="text-7xl animate-float">🎬</span>
            <h2 className="text-2xl font-black">No videos found</h2>
            <p className="text-gray-400 text-sm">
              Add video files to your{' '}
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300">VIDEO_DIR</code>
              {' '}folder.
            </p>
          </div>
        )}

        {/* ── Main content ── */}
        {videos && videos.length > 0 && (
          <>
            {/* Hero */}
            <div className="relative w-full overflow-hidden" style={{ height: '58vh', minHeight: 300 }}>
              {hero?.hasThumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/video?id=${hero.id}&thumb=1`}
                  alt={hero.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{ background: heroGradient }} />
              )}

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#14141430] to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/70 via-transparent to-transparent" />

              {/* Hero text */}
              <div className="absolute bottom-0 left-0 px-6 sm:px-12 pb-10 sm:pb-14 max-w-xl">
                <div
                  className="inline-block text-xs font-black px-2.5 py-1 rounded-full mb-3"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                >
                  NEW
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white drop-shadow-2xl leading-tight mb-2">
                  {hero?.title}
                </h1>
                <p className="text-gray-300 text-sm mb-6">{formatSize(hero?.size ?? 0)}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => hero && setPlaying(hero)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-black text-white text-base hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
                  >
                    <span>▶</span> Play
                  </button>
                  <button
                    onClick={() => hero && setPlaying(hero)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-black text-white text-base bg-white/20 hover:bg-white/30 hover:scale-105 active:scale-95 transition-all backdrop-blur-sm"
                  >
                    <span>ℹ️</span> More Info
                  </button>
                </div>
              </div>
            </div>

            {/* Category rows */}
            <div className="px-6 sm:px-12 pb-16 space-y-10 -mt-6 relative z-10">
              {categories.map(category => (
                <section key={category}>
                  <h2 className="text-base sm:text-lg font-black text-white mb-3 flex items-center gap-2">
                    {category === 'Library' ? '🎬' : '📁'} {category}
                    <span className="text-gray-500 font-normal text-sm">
                      {byCategory![category].length} video{byCategory![category].length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  <ScrollRow videos={byCategory![category]} onPlay={setPlaying} />
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
