import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const body = await req.json()
  if (body.categoryId !== undefined) {
    await sql`UPDATE cc_transactions SET category_id = ${body.categoryId} WHERE id = ${id}`
  }
  if (body.chugId !== undefined) {
    const val = body.chugId || null
    await sql`UPDATE cc_transactions SET chug_id = ${val} WHERE id = ${id}`
  }
  return Response.json({ ok: true })
}
