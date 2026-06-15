import sql, { initAviadDb } from '@/lib/db'

export async function POST(req: Request) {
  await initAviadDb()
  const sub = await req.json()
  if (!sub?.endpoint) return Response.json({ error: 'Invalid subscription' }, { status: 400 })
  await sql`
    INSERT INTO aviad_push_subscriptions (endpoint, subscription, created_at)
    VALUES (${sub.endpoint}, ${JSON.stringify(sub)}, ${new Date().toISOString()})
    ON CONFLICT (endpoint) DO UPDATE SET subscription = EXCLUDED.subscription
  `
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  await initAviadDb()
  const { endpoint } = await req.json()
  if (endpoint) await sql`DELETE FROM aviad_push_subscriptions WHERE endpoint = ${endpoint}`
  return Response.json({ ok: true })
}
