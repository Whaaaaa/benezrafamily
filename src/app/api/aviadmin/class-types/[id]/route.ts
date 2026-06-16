import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name } = await req.json()
  await sql`UPDATE aviad_class_types SET name = ${name} WHERE id = ${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_assignments WHERE class_type_id = ${id}`
  await sql`DELETE FROM aviad_classes WHERE class_type_id = ${id}`
  await sql`DELETE FROM aviad_class_types WHERE id = ${id}`
  return Response.json({ ok: true })
}
