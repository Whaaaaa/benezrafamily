import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  await sql`DELETE FROM manual_transactions WHERE id = ${id}`
  return Response.json({ ok: true })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const body = await req.json()
  const { categoryId, isRecurring, recurringInterval, recurringStartMonth } = body
  if (categoryId !== undefined) {
    await sql`UPDATE manual_transactions SET category_id = ${categoryId} WHERE id = ${id}`
  }
  if (isRecurring !== undefined) {
    await sql`
      UPDATE manual_transactions
      SET is_recurring = ${isRecurring},
          recurring_interval = ${recurringInterval ?? 'monthly'},
          recurring_start_month = ${recurringStartMonth ?? null}
      WHERE id = ${id}
    `
  }
  return Response.json({ ok: true })
}
