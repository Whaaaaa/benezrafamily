import { NextResponse } from 'next/server'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const VIDEO_EXTENSIONS    = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v'])
const THUMBNAIL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export interface VideoMeta {
  id: string
  title: string
  category: string
  url: string
  thumbnailUrl: string | null
  size: number
  mtime: number
}

function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[._\-]+/g, ' ')
    .trim()
}

// ── R2 mode ──────────────────────────────────────────────────────────────────

async function listFromR2(): Promise<VideoMeta[]> {
  const allObjects: { Key: string; Size: number; LastModified: Date }[] = []
  let token: string | undefined

  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket:            R2_BUCKET,
      ContinuationToken: token,
    }))
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Size !== undefined && obj.LastModified) {
        allObjects.push({ Key: obj.Key, Size: obj.Size, LastModified: obj.LastModified })
      }
    }
    token = res.NextContinuationToken
  } while (token)

  const keySet = new Set(allObjects.map(o => o.Key))

  const videos: VideoMeta[] = []
  for (const obj of allObjects) {
    const key      = obj.Key
    const ext      = key.slice(key.lastIndexOf('.')).toLowerCase()
    if (!VIDEO_EXTENSIONS.has(ext)) continue

    const segments = key.split('/')
    const filename = segments.at(-1)!
    const category = segments.length > 1 ? segments[0] : 'Library'
    const base     = key.slice(0, key.length - ext.length)

    const thumbExt   = THUMBNAIL_EXTENSIONS.find(te => keySet.has(base + te)) ?? null
    const encodedKey = segments.map(encodeURIComponent).join('/')

    videos.push({
      id:           Buffer.from(key).toString('base64url'),
      title:        titleFromFilename(filename),
      category,
      url:          `${R2_PUBLIC_URL}/${encodedKey}`,
      thumbnailUrl: thumbExt ? `${R2_PUBLIC_URL}/${base.split('/').map(encodeURIComponent).join('/')}${thumbExt}` : null,
      size:         obj.Size,
      mtime:        obj.LastModified.getTime(),
    })
  }

  return videos.sort((a, b) => b.mtime - a.mtime)
}

// ── Local mode ───────────────────────────────────────────────────────────────

function listFromLocal(videoDir: string): VideoMeta[] {
  const videos: VideoMeta[] = []

  function scanDir(dir: string, category: string) {
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
    catch { return }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath, entry.name)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!VIDEO_EXTENSIONS.has(ext)) continue

        const relPath      = path.relative(videoDir, fullPath)
        const stat         = fs.statSync(fullPath)
        const base         = fullPath.slice(0, fullPath.length - ext.length)
        const hasThumbnail = THUMBNAIL_EXTENSIONS.some(te => fs.existsSync(base + te))
        const id           = Buffer.from(relPath).toString('base64url')

        videos.push({
          id,
          title:        titleFromFilename(entry.name),
          category,
          url:          `/api/video?id=${id}`,
          thumbnailUrl: hasThumbnail ? `/api/video?id=${id}&thumb=1` : null,
          size:         stat.size,
          mtime:        stat.mtimeMs,
        })
      }
    }
  }

  scanDir(videoDir, 'Library')
  return videos.sort((a, b) => b.mtime - a.mtime)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  // R2 takes priority (production)
  if (process.env.R2_BUCKET_NAME) {
    try {
      const videos = await listFromR2()
      return NextResponse.json(videos)
    } catch (err) {
      return NextResponse.json({ error: `R2 error: ${String(err)}` }, { status: 500 })
    }
  }

  // Local fallback (dev)
  const videoDir = process.env.VIDEO_DIR
  if (!videoDir) {
    return NextResponse.json({ error: 'VIDEO_DIR not configured' }, { status: 500 })
  }
  if (!fs.existsSync(videoDir)) {
    return NextResponse.json({ error: `VIDEO_DIR does not exist: ${videoDir}` }, { status: 500 })
  }

  return NextResponse.json(listFromLocal(videoDir))
}
