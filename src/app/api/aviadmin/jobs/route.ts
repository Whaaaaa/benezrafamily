import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`
    SELECT j.*, c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address
    FROM aviad_jobs j
    LEFT JOIN aviad_customers c ON c.id = j.customer_id
    ORDER BY j.created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, customer_id, notes, first_hour_rate, additional_hour_rate, created_at } = await req.json()
  await sql`
    INSERT INTO aviad_jobs (id, customer_id, notes, first_hour_rate, additional_hour_rate, created_at)
    VALUES (${id}, ${customer_id}, ${notes}, ${first_hour_rate}, ${additional_hour_rate}, ${created_at})
  `
  return Response.json({ ok: true })
}
