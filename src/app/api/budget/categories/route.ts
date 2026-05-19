import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, name, budget_amount as "budgetAmount", sort_order as "sortOrder"
    FROM budget_categories ORDER BY sort_order
  `
  return Response.json(rows)
}

export async function PUT(req: Request) {
  await initDb()
  const updates: { id: string; budgetAmount: number }[] = await req.json()
  for (const { id, budgetAmount } of updates) {
    await sql`UPDATE budget_categories SET budget_amount = ${budgetAmount} WHERE id = ${id}`
  }
  return Response.json({ ok: true })
}
