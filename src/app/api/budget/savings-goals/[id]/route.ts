import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const { name, targetAmount, emoji, color } = await req.json()
  await sql`
    UPDATE savings_goals
    SET name=${name}, target_amount=${targetAmount}, emoji=${emoji}, color=${color}
    WHERE id=${id}
  `
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  await sql`UPDATE savings_accounts SET goal_id = NULL WHERE goal_id = ${id}`
  await sql`DELETE FROM savings_goals WHERE id=${id}`
  return Response.json({ ok: true })
}
