import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { notes, first_hour_rate, additional_hour_rate, completed_at } = await req.json()
  await sql`
    UPDATE aviad_jobs
    SET notes = ${notes}, first_hour_rate = ${first_hour_rate},
        additional_hour_rate = ${additional_hour_rate}, completed_at = ${completed_at ?? null}
    WHERE id = ${id}
  `
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_job_events WHERE job_id = ${id}`
  await sql`DELETE FROM aviad_invoices WHERE job_id = ${id}`
  await sql`DELETE FROM aviad_jobs WHERE id = ${id}`
  return Response.json({ ok: true })
}
