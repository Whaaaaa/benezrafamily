import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_class_types WHERE id = ${id}`
  return Response.json({ ok: true })
}
