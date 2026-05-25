import sql, { initDb } from '@/lib/db'

export async function GET(req: Request) {
  try {
    await initDb()
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    if (!month) return Response.json([])
    if (month === 'all') {
      const rows = await sql`
        SELECT id, date, description, amount, category_id as "categoryId", month, chug_id as "chugId"
        FROM cc_transactions ORDER BY date DESC, id
      `
      return Response.json(rows)
    }
    const rows = await sql`
      SELECT id, date, description, amount, category_id as "categoryId", month, chug_id as "chugId"
      FROM cc_transactions WHERE month = ${month} ORDER BY date DESC
    `
    return Response.json(rows)
  } catch (err) {
    console.error('GET /api/budget/cc-transactions', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
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
  } catch (err) {
    console.error('POST /api/budget/cc-transactions', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
