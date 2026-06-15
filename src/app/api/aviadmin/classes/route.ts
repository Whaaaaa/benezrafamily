import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`
    SELECT cl.*, ct.name AS class_type_name
    FROM aviad_classes cl
    LEFT JOIN aviad_class_types ct ON ct.id = cl.class_type_id
    ORDER BY cl.start_time DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, class_type_id, duration_hours, start_time, end_time, notes, series_id } = await req.json()
  await sql`
    INSERT INTO aviad_classes (id, class_type_id, duration_hours, start_time, end_time, notes, series_id)
    VALUES (${id}, ${class_type_id}, ${duration_hours}, ${start_time}, ${end_time}, ${notes}, ${series_id ?? null})
  `
  return Response.json({ ok: true })
}
