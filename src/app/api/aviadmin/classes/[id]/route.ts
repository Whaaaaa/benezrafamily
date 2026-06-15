import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { class_type_id, duration_hours, start_time, end_time, notes } = await req.json()
  await sql`UPDATE aviad_classes SET class_type_id=${class_type_id}, duration_hours=${duration_hours}, start_time=${start_time}, end_time=${end_time}, notes=${notes} WHERE id=${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_classes WHERE id = ${id}`
  return Response.json({ ok: true })
}
