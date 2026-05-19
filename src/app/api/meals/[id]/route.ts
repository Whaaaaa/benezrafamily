import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/meals/[id]'>) {
  const { id } = await ctx.params
  await sql`DELETE FROM meals WHERE id = ${id}`
  return Response.json({ ok: true })
}
