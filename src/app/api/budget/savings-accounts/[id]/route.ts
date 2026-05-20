import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const { name, balance } = await req.json()
  if (name !== undefined) {
    await sql`UPDATE savings_accounts SET name=${name}, balance=${balance} WHERE id=${id}`
  } else {
    await sql`UPDATE savings_accounts SET balance=${balance} WHERE id=${id}`
  }
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  await sql`DELETE FROM savings_accounts WHERE id=${id}`
  return Response.json({ ok: true })
}
