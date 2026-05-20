import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, name, balance, currency, goal_id FROM savings_accounts ORDER BY name
  `
  return Response.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    balance: Number(r.balance),
    currency: r.currency,
    goalId: r.goal_id ?? null,
  })))
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, balance, currency, goalId } = await req.json()
  await sql`
    INSERT INTO savings_accounts (id, name, balance, currency, goal_id)
    VALUES (${id}, ${name}, ${balance}, ${currency ?? 'ILS'}, ${goalId ?? null})
  `
  return Response.json({ ok: true })
}
