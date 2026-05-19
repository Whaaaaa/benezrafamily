import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/period/[date]'>) {
  const { date } = await ctx.params
  await sql`DELETE FROM period_dates WHERE date = ${date}`
  return Response.json({ ok: true })
}
