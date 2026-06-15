import webpush from 'web-push'
import sql from '@/lib/db'

let configured = false

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

function configure(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv)
  configured = true
  return true
}

type Payload = { title: string; body: string; url?: string; tag?: string }

// Send a notification to every stored subscription. Prunes dead subscriptions.
export async function sendPushToAll(payload: Payload): Promise<{ sent: number; failed: number }> {
  if (!configure()) throw new Error('VAPID keys not configured')
  const rows = await sql`SELECT endpoint, subscription FROM aviad_push_subscriptions`
  let sent = 0
  let failed = 0
  for (const row of rows as { endpoint: string; subscription: string }[]) {
    try {
      const sub = JSON.parse(row.subscription)
      await webpush.sendNotification(sub, JSON.stringify(payload))
      sent++
    } catch (err: unknown) {
      failed++
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        await sql`DELETE FROM aviad_push_subscriptions WHERE endpoint = ${row.endpoint}`
      }
    }
  }
  return { sent, failed }
}
