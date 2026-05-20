import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`SELECT id, date, name, template_id as "templateId" FROM meals ORDER BY date`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { id, date, name, templateId } = await req.json()
  await sql`INSERT INTO meals (id, date, name, template_id) VALUES (${id}, ${date}, ${name}, ${templateId ?? ''})`
  return Response.json({ ok: true })
}
