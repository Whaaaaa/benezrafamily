import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { paid_at, payment_method } = await req.json()
  await sql`UPDATE aviad_invoices SET paid_at = ${paid_at}, payment_method = ${payment_method} WHERE id = ${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_invoices WHERE id = ${id}`
  return Response.json({ ok: true })
}
