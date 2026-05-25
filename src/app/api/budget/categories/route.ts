import sql, { initDb } from '@/lib/db'

export async function GET() {
  try {
    await initDb()
    const rows = await sql`
      SELECT id, name, budget_amount as "budgetAmount", sort_order as "sortOrder"
      FROM budget_categories ORDER BY sort_order
    `
    return Response.json(rows.map(r => ({ ...r, budgetAmount: Number(r.budgetAmount) })))
  } catch (err) {
    console.error('GET /api/budget/categories', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    await initDb()
    const updates: { id: string; budgetAmount: number }[] = await req.json()
    for (const { id, budgetAmount } of updates) {
      await sql`UPDATE budget_categories SET budget_amount = ${budgetAmount} WHERE id = ${id}`
    }
    return Response.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/budget/categories', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
