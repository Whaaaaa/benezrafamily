import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`SELECT * FROM aviad_class_types ORDER BY name`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, name } = await req.json()
  const rows = await sql`
    INSERT INTO aviad_class_types (id, name) VALUES (${id}, ${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  return Response.json({ ok: true, id: rows[0].id })
}
