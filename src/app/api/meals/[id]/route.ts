import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/meals/[id]'>) {
  const { id } = await ctx.params
  const { templateId } = await req.json()
  await sql`UPDATE meals SET template_id = ${templateId ?? ''} WHERE id = ${id}`
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/meals/[id]'>) {
  const { id } = await ctx.params
  await sql`DELETE FROM meals WHERE id = ${id}`
  return Response.json({ ok: true })
}
