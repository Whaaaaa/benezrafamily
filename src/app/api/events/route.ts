import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`SELECT id, date, title, color FROM calendar_events ORDER BY date`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { id, date, title, color } = await req.json()
  await sql`INSERT INTO calendar_events (id, date, title, color) VALUES (${id}, ${date}, ${title}, ${color})`
  return Response.json({ ok: true })
}
