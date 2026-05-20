import sql from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/shopping/[id]'>) {
  const { id } = await ctx.params
  const body = await req.json()
  if ('quantity' in body) {
    await sql`UPDATE shopping_items SET quantity = ${body.quantity} WHERE id = ${id}`
  } else {
    await sql`UPDATE shopping_items SET checked = ${body.checked} WHERE id = ${id}`
  }
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/shopping/[id]'>) {
  const { id } = await ctx.params
  await sql`DELETE FROM shopping_items WHERE id = ${id}`
  return Response.json({ ok: true })
}
