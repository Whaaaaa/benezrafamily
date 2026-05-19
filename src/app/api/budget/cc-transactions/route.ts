import sql, { initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return Response.json([])
  const rows = await sql`
    SELECT id, date, description, amount, category_id as "categoryId", month
    FROM cc_transactions WHERE month = ${month} ORDER BY date DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { month, transactions } = await req.json()
  await sql`DELETE FROM cc_transactions WHERE month = ${month}`
  for (const t of transactions) {
    await sql`
      INSERT INTO cc_transactions (id, date, description, amount, category_id, month)
      VALUES (${t.id}, ${t.date}, ${t.description}, ${t.amount}, ${t.categoryId ?? ''}, ${month})
    `
  }
  return Response.json({ ok: true, count: transactions.length })
}
