import sql, { initDb } from '@/lib/db'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await ctx.params
  const { ingredients } = await req.json() as {
    ingredients: { id: string; name: string; quantity?: string }[]
  }
  await sql`DELETE FROM meal_template_ingredients WHERE template_id = ${id}`
  for (const ing of ingredients) {
    await sql`
      INSERT INTO meal_template_ingredients (id, template_id, name, quantity)
      VALUES (${ing.id}, ${id}, ${ing.name}, ${ing.quantity ?? ''})
    `
  }
  return Response.json({ ok: true })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await initDb()
  const { id } = await ctx.params
  await sql`DELETE FROM meal_template_ingredients WHERE template_id = ${id}`
  await sql`DELETE FROM meal_templates WHERE id = ${id}`
  return Response.json({ ok: true })
}
