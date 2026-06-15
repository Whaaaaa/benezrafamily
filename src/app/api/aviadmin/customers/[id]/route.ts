import sql, { initAviadDb } from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initAviadDb()
  const { id } = await params
  const [customer] = await sql`SELECT * FROM aviad_customers WHERE id = ${id}`
  if (!customer) return Response.json({ error: 'Not found' }, { status: 404 })

  const jobs = await sql`
    SELECT * FROM aviad_jobs WHERE customer_id = ${id} ORDER BY created_at DESC
  `
  const events = jobs.length
    ? await sql`
        SELECT e.* FROM aviad_job_events e
        WHERE e.job_id = ANY(${jobs.map(j => j.id)})
        ORDER BY e.start_time
      `
    : []

  const jobsWithEvents = jobs.map((j: Record<string, unknown>) => ({
    ...j,
    events: (events as Record<string, unknown>[]).filter((e: Record<string, unknown>) => e.job_id === j.id),
  }))

  return Response.json({ ...customer, jobs: jobsWithEvents })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initAviadDb()
  const { id } = await params
  const { name, phone, address } = await req.json()
  await sql`UPDATE aviad_customers SET name=${name}, phone=${phone}, address=${address} WHERE id=${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql`DELETE FROM aviad_job_events WHERE job_id IN (SELECT id FROM aviad_jobs WHERE customer_id=${id})`
  await sql`DELETE FROM aviad_jobs WHERE customer_id=${id}`
  await sql`DELETE FROM aviad_customers WHERE id=${id}`
  return Response.json({ ok: true })
}
