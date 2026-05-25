import sql, { initDb } from '@/lib/db'

export async function GET() {
  try {
    await initDb()
    const rows = await sql`
      SELECT description, category_id as "categoryId" FROM description_mappings
    `
    return Response.json(rows)
  } catch (err) {
    console.error('GET /api/budget/description-mappings', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await initDb()
    const { description, categoryId } = await req.json()
    await sql`
      INSERT INTO description_mappings (description, category_id)
      VALUES (${description}, ${categoryId})
      ON CONFLICT (description) DO UPDATE SET category_id = ${categoryId}
    `
    return Response.json({ ok: true })
  } catch (err) {
    console.error('POST /api/budget/description-mappings', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
