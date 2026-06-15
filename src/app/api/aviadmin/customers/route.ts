import sql, { initAviadDb } from '@/lib/db'

export async function GET() {
  await initAviadDb()
  const rows = await sql`SELECT * FROM aviad_customers ORDER BY name`
  return Response.json(rows)
}

export async function POST(req: Request) {
  await initAviadDb()
  const { id, name, phone, address, created_at } = await req.json()
  await sql`INSERT INTO aviad_customers (id, name, phone, address, created_at)
            VALUES (${id}, ${name}, ${phone}, ${address}, ${created_at})`
  return Response.json({ ok: true })
}
