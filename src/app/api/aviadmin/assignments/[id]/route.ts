import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { subject, notes, due_at, reminders_enabled } = await req.json()
  await sql`
    UPDATE aviad_assignments
    SET subject = ${subject}, notes = ${notes}, due_at = ${due_at},
        reminders_enabled = ${reminders_enabled ?? true}, reminder_sent = FALSE
    WHERE id = ${id}
  `
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_assignments WHERE id = ${id}`
  return Response.json({ ok: true })
}
