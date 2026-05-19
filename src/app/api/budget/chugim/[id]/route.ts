import sql, { initDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  const { name, child, days, time, monthlyCost } = await req.json()
  const daysJson = JSON.stringify(days)
  await sql`
    UPDATE chugim SET name=${name}, child=${child}, days=${daysJson}, time=${time}, monthly_cost=${monthlyCost}
    WHERE id = ${id}
  `
  await sql`
    UPDATE manual_transactions
    SET description = ${`${name} (${child})`}, amount = ${monthlyCost}
    WHERE chug_id = ${id}
  `
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await params
  await sql`DELETE FROM manual_transactions WHERE chug_id = ${id}`
  await sql`DELETE FROM chugim WHERE id = ${id}`
  return Response.json({ ok: true })
}
