import { getVapidPublicKey } from '@/lib/push'

export async function GET() {
  const key = getVapidPublicKey()
  return Response.json({ publicKey: key, configured: Boolean(key) })
}
