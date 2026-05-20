import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, name, child, days, time, monthly_cost as "monthlyCost"
    FROM chugim ORDER BY name
  `
  return Response.json(rows.map(r => ({
    ...r,
    days: JSON.parse(String(r.days || '[]')),
    monthlyCost: Number(r.monthlyCost),
  })))
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, child, days, time, monthlyCost } = await req.json()
  const daysJson = JSON.stringify(days)
  await sql`
    INSERT INTO chugim (id, name, child, days, time, monthly_cost)
    VALUES (${id}, ${name}, ${child}, ${daysJson}, ${time}, ${monthlyCost})
  `
  return Response.json({ ok: true })
}
