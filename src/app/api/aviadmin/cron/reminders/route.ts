import sql, { initAviadDb } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'

const TZ = 'Asia/Jerusalem'

// Stored times are naive wall-clock (Asia/Jerusalem, as entered in the browser).
// Comparing both "now" and the stored time after parsing them the same way keeps
// the difference correct regardless of the server's timezone.
function minutesUntil(naive: string): number {
  const target = new Date(naive).getTime()
  const nowJer = new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).getTime()
  return (target - nowJer) / 60000
}

function fmtTime(naive: string) {
  return new Date(naive).toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function run(req: Request) {
  await initAviadDb()

  const secret = process.env.CRON_SECRET
  if (secret) {
    const url = new URL(req.url)
    const provided = url.searchParams.get('secret') || req.headers.get('authorization')?.replace('Bearer ', '')
    if (provided !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lead = Number(process.env.REMINDER_LEAD_MINUTES || 30)
  const inWindow = (naive: string) => {
    const m = minutesUntil(naive)
    return m <= lead && m >= -2
  }

  let sent = 0

  // Job appointment sessions
  const jobEvents = await sql`
    SELECT e.id, e.start_time, c.name AS customer_name
    FROM aviad_job_events e
    LEFT JOIN aviad_jobs j ON j.id = e.job_id
    LEFT JOIN aviad_customers c ON c.id = j.customer_id
    WHERE e.reminders_enabled = TRUE AND e.reminder_sent = FALSE
  `
  for (const ev of jobEvents as { id: string; start_time: string; customer_name: string }[]) {
    if (!inWindow(ev.start_time)) continue
    await sendPushToAll({
      title: '💼 Upcoming appointment',
      body: `${ev.customer_name || 'Job'} at ${fmtTime(ev.start_time)}`,
      url: '/aviadmin', tag: `job-${ev.id}`,
    })
    await sql`UPDATE aviad_job_events SET reminder_sent = TRUE WHERE id = ${ev.id}`
    sent++
  }

  // Classes
  const classes = await sql`
    SELECT cl.id, cl.start_time, ct.name AS class_type_name
    FROM aviad_classes cl
    LEFT JOIN aviad_class_types ct ON ct.id = cl.class_type_id
    WHERE cl.reminders_enabled = TRUE AND cl.reminder_sent = FALSE
  `
  for (const cl of classes as { id: string; start_time: string; class_type_name: string }[]) {
    if (!inWindow(cl.start_time)) continue
    await sendPushToAll({
      title: '🎓 Upcoming class',
      body: `${cl.class_type_name || 'Class'} at ${fmtTime(cl.start_time)}`,
      url: '/aviadmin', tag: `class-${cl.id}`,
    })
    await sql`UPDATE aviad_classes SET reminder_sent = TRUE WHERE id = ${cl.id}`
    sent++
  }

  // Assignments
  const assignments = await sql`
    SELECT a.id, a.subject, a.due_at, ct.name AS class_type_name
    FROM aviad_assignments a
    LEFT JOIN aviad_classes cl ON cl.id = a.class_id
    LEFT JOIN aviad_class_types ct ON ct.id = cl.class_type_id
    WHERE a.reminders_enabled = TRUE AND a.reminder_sent = FALSE
  `
  for (const a of assignments as { id: string; subject: string; due_at: string; class_type_name: string }[]) {
    if (!inWindow(a.due_at)) continue
    await sendPushToAll({
      title: '📝 Assignment due',
      body: `${a.subject || 'Assignment'}${a.class_type_name ? ` · ${a.class_type_name}` : ''} at ${fmtTime(a.due_at)}`,
      url: '/aviadmin', tag: `assignment-${a.id}`,
    })
    await sql`UPDATE aviad_assignments SET reminder_sent = TRUE WHERE id = ${a.id}`
    sent++
  }

  return Response.json({ ok: true, sent })
}

export async function GET(req: Request) {
  try { return await run(req) } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try { return await run(req) } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
