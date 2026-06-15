import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`SELECT * FROM aviad_job_events ORDER BY start_time`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, job_id, start_time, end_time, series_id, reminders_enabled } = await req.json()
  await sql`
    INSERT INTO aviad_job_events (id, job_id, start_time, end_time, series_id, reminders_enabled)
    VALUES (${id}, ${job_id}, ${start_time}, ${end_time}, ${series_id ?? null}, ${reminders_enabled ?? true})
  `
  return Response.json({ ok: true })
}
