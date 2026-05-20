import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const templates = await sql`SELECT id, name FROM meal_templates ORDER BY name`
  const ingredients = await sql`SELECT id, template_id, name, quantity FROM meal_template_ingredients ORDER BY id`
  const result = (templates as { id: string; name: string }[]).map(t => ({
    ...t,
    ingredients: (ingredients as { id: string; template_id: string; name: string; quantity: string }[])
      .filter(i => i.template_id === t.id)
      .map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
  }))
  return Response.json(result)
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, ingredients = [] } = await req.json()
  await sql`
    INSERT INTO meal_templates (id, name)
    VALUES (${id}, ${name})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `
  for (const ing of ingredients as { id: string; name: string; quantity?: string }[]) {
    await sql`
      INSERT INTO meal_template_ingredients (id, template_id, name, quantity)
      VALUES (${ing.id}, ${id}, ${ing.name}, ${ing.quantity ?? ''})
      ON CONFLICT (id) DO NOTHING
    `
  }
  return Response.json({ ok: true })
}
