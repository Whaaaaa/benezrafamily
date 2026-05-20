import sql, { initDb } from '@/lib/db'

export async function GET(req: Request) {
  await initDb()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let rows
  if (from && to) {
    rows = await sql`
      SELECT s.id, s.name, s.quantity, s.checked, s.meal_id as "mealId"
      FROM shopping_items s
      LEFT JOIN meals m ON s.meal_id = m.id
      WHERE s.meal_id = '' OR (m.date >= ${from} AND m.date <= ${to})
      ORDER BY s.meal_id, s.id
    `
  } else {
    rows = await sql`SELECT id, name, quantity, checked, meal_id as "mealId" FROM shopping_items ORDER BY meal_id, id`
  }

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
