import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`SELECT id, date, name FROM meals ORDER BY date`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { id, date, name } = await req.json()
  await sql`INSERT INTO meals (id, date, name) VALUES (${id}, ${date}, ${name})`
  return Response.json({ ok: true })
}
