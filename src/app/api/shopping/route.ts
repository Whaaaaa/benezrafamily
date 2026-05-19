import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`SELECT id, name, quantity, checked, meal_id as "mealId" FROM shopping_items ORDER BY id`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, quantity, checked, mealId } = await req.json()
  await sql`
    INSERT INTO shopping_items (id, name, quantity, checked, meal_id)
    VALUES (${id}, ${name}, ${quantity ?? ''}, ${checked ?? false}, ${mealId ?? ''})
  `
  return Response.json({ ok: true })
}
