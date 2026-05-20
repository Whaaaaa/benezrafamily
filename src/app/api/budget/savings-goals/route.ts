import sql, { initDb } from '@/lib/db'

export async function GET() {
  await initDb()
  const rows = await sql`
    SELECT id, name, target_amount, emoji, color FROM savings_goals ORDER BY name
  `
  return Response.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    targetAmount: Number(r.target_amount),
    emoji: r.emoji,
    color: r.color,
  })))
}

export async function POST(req: Request) {
  await initDb()
  const { id, name, targetAmount, emoji, color } = await req.json()
  await sql`
    INSERT INTO savings_goals (id, name, target_amount, emoji, color)
    VALUES (${id}, ${name}, ${targetAmount}, ${emoji ?? '🎯'}, ${color ?? 'emerald'})
  `
  return Response.json({ ok: true })
}
