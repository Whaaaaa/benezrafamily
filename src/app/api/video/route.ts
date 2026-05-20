import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

export const runtime = 'nodejs'

const MIME_TYPES: Record<string, string> = {
  '.mp4':  'video/mp4',
  '.mkv':  'video/x-matroska',
  '.webm': 'video/webm',
  '.mov':  'video/quicktime',
  '.avi':  'video/x-msvideo',
  '.m4v':  'video/mp4',
}

const THUMBNAIL_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const THUMBNAIL_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png',  '.webp': 'image/webp',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id    = searchParams.get('id')
  const thumb = searchParams.get('thumb') === '1'

  const videoDir = process.env.VIDEO_DIR
  if (!videoDir || !id) return new NextResponse('Missing params', { status: 400 })

  let relPath: string
  try {
    relPath = Buffer.from(id, 'base64url').toString()
  } catch {
    return new NextResponse('Invalid id', { status: 400 })
  }

  // Prevent directory traversal
  const resolvedBase = path.resolve(videoDir)
  const fullPath     = path.resolve(path.join(videoDir, relPath))
  if (fullPath !== resolvedBase && !fullPath.startsWith(resolvedBase + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  if (!fs.existsSync(fullPath)) return new NextResponse('Not found', { status: 404 })

  // Serve thumbnail
  if (thumb) {
    const ext  = path.extname(fullPath).toLowerCase()
    const base = fullPath.slice(0, fullPath.length - ext.length)
    for (const te of THUMBNAIL_EXTENSIONS) {
      const tp = base + te
      if (fs.existsSync(tp)) {
        const data = fs.readFileSync(tp)
        return new NextResponse(data, {
          headers: {
            'Content-Type':  THUMBNAIL_MIME[te] ?? 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }
    }
    return new NextResponse('No thumbnail', { status: 404 })
  }

  // Stream video with range support
  const stat     = fs.statSync(fullPath)
  const fileSize = stat.size
  const mimeType = MIME_TYPES[path.extname(fullPath).toLowerCase()] ?? 'video/mp4'
  const range    = request.headers.get('range')

  if (range) {
    const [s, e]    = range.replace(/bytes=/, '').split('-')
    const start     = parseInt(s, 10)
    const end       = e ? parseInt(e, 10) : Math.min(start + 10 * 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1
    const webStream = Readable.toWeb(
      fs.createReadStream(fullPath, { start, end })
    ) as ReadableStream

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type':   mimeType,
      },
    })
  }

  const webStream = Readable.toWeb(
    fs.createReadStream(fullPath)
  ) as ReadableStream

  return new NextResponse(webStream, {
    headers: {
      'Content-Length': String(fileSize),
      'Content-Type':   mimeType,
      'Accept-Ranges':  'bytes',
    },
  })
}
