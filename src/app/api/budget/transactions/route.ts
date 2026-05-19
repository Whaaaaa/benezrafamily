import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, date, description, amount, category_id as "categoryId",
           is_recurring as "isRecurring", recurring_day as "recurringDay", chug_id as "chugId"
    FROM manual_transactions ORDER BY date DESC, id
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initDb()
  const { id, date, description, amount, categoryId, isRecurring, recurringDay } = await req.json()
  await sql`
    INSERT INTO manual_transactions (id, date, description, amount, category_id, is_recurring, recurring_day)
    VALUES (${id}, ${date}, ${description}, ${amount}, ${categoryId ?? ''}, ${isRecurring ?? false}, ${recurringDay ?? null})
  `
  return Response.json({ ok: true })
}
