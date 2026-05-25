import sql, { initDb } from '@/lib/db'

export async function GET() {
  try {
    await initDb()
    const rows = await sql`
      SELECT id, date, description, amount, category_id as "categoryId",
             is_recurring as "isRecurring", recurring_day as "recurringDay",
             chug_id as "chugId",
             recurring_interval as "recurringInterval",
             recurring_start_month as "recurringStartMonth"
      FROM manual_transactions ORDER BY date DESC, id
    `
    return Response.json(rows)
  } catch (err) {
    console.error('GET /api/budget/transactions', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await initDb()
    const {
      id, date, description, amount, categoryId,
      isRecurring, recurringDay, chugId,
      recurringInterval, recurringStartMonth,
    } = await req.json()
    await sql`
      INSERT INTO manual_transactions
        (id, date, description, amount, category_id, is_recurring, recurring_day, chug_id, recurring_interval, recurring_start_month)
      VALUES (
        ${id}, ${date}, ${description}, ${amount},
        ${categoryId ?? ''}, ${isRecurring ?? false}, ${recurringDay ?? null},
        ${chugId ?? null},
        ${recurringInterval ?? 'monthly'}, ${recurringStartMonth ?? null}
      )
    `
    return Response.json({ ok: true })
  } catch (err) {
    console.error('POST /api/budget/transactions', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
