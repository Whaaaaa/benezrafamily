import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, name, balance, currency FROM savings_accounts ORDER BY name
  `
  return Response.json(rows.map(r => ({ ...r, balance: Number(r.balance) })))
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, balance, currency } = await req.json()
  await sql`
    INSERT INTO savings_accounts (id, name, balance, currency)
    VALUES (${id}, ${name}, ${balance}, ${currency ?? 'ILS'})
  `
  return Response.json({ ok: true })
}
