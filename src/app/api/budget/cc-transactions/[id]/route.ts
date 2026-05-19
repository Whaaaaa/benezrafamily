import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const { categoryId } = await req.json()
  await sql`UPDATE cc_transactions SET category_id = ${categoryId} WHERE id = ${id}`
  return Response.json({ ok: true })
}
