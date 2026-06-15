import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`
    SELECT a.*, ct.name AS class_type_name, cl.start_time AS class_start_time
    FROM aviad_assignments a
    LEFT JOIN aviad_classes cl ON cl.id = a.class_id
    LEFT JOIN aviad_class_types ct ON ct.id = cl.class_type_id
    ORDER BY a.due_at
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, class_id, subject, notes, due_at, reminders_enabled, created_at } = await req.json()
  await sql`
    INSERT INTO aviad_assignments (id, class_id, subject, notes, due_at, reminders_enabled, created_at)
    VALUES (${id}, ${class_id}, ${subject}, ${notes}, ${due_at}, ${reminders_enabled ?? true}, ${created_at})
  `
  return Response.json({ ok: true })
}
