import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`
    SELECT i.*, c.name AS customer_name
    FROM aviad_invoices i
    LEFT JOIN aviad_customers c ON c.id = i.customer_id
    ORDER BY i.created_at DESC
  `
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, job_id, customer_id, amount, total_minutes, description, created_at } = await req.json()
  await sql`
    INSERT INTO aviad_invoices (id, job_id, customer_id, amount, total_minutes, description, created_at)
    VALUES (${id}, ${job_id}, ${customer_id}, ${amount}, ${total_minutes}, ${description}, ${created_at})
  `
  return Response.json({ ok: true })
}
