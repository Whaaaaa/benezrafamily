import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`SELECT date FROM period_dates ORDER BY date`
  return Response.json(rows.map(r => (r as { date: string }).date))
}

export async function POST(req: Request) {
  await initDb()
  const { date } = await req.json()
  await sql`INSERT INTO period_dates (date) VALUES (${date}) ON CONFLICT DO NOTHING`
  return Response.json({ ok: true })
}
