import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.webm', '.mov', '.avi', '.m4v'])
const THUMBNAIL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export interface VideoMeta {
  id: string
  title: string
  category: string
  hasThumbnail: boolean
  size: number
  mtime: number
}

function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[._\-]+/g, ' ')
    .trim()
}

export async function GET() {
  const videoDir = process.env.VIDEO_DIR
  if (!videoDir) {
    return NextResponse.json({ error: 'VIDEO_DIR not configured' }, { status: 500 })
  }
  if (!fs.existsSync(videoDir)) {
    return NextResponse.json({ error: `VIDEO_DIR does not exist: ${videoDir}` }, { status: 500 })
  }

  const videos: VideoMeta[] = []

  function scanDir(dir: string, category: string) {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath, entry.name)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (!VIDEO_EXTENSIONS.has(ext)) continue

        const relPath = path.relative(videoDir, fullPath)
        const stat = fs.statSync(fullPath)
        const base = fullPath.slice(0, fullPath.length - ext.length)
        const hasThumbnail = THUMBNAIL_EXTENSIONS.some(te => fs.existsSync(base + te))

        videos.push({
          id: Buffer.from(relPath).toString('base64url'),
          title: titleFromFilename(entry.name),
          category,
          hasThumbnail,
          size: stat.size,
          mtime: stat.mtimeMs,
        })
      }
    }
  }

  scanDir(videoDir, 'Library')
  videos.sort((a, b) => b.mtime - a.mtime)

  return NextResponse.json(videos)
}
