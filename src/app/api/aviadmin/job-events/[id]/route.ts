import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { start_time, end_time } = await req.json()
  await sql`UPDATE aviad_job_events SET start_time=${start_time}, end_time=${end_time} WHERE id=${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_job_events WHERE id = ${id}`
  return Response.json({ ok: true })
}
