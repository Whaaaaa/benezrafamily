import { initAviadDb } from '@/lib/db'
import { sendPushToAll } from '@/lib/push'

export async function POST() {
  await initAviadDb()
  try {
    const result = await sendPushToAll({
      title: 'Avi Calendar',
      body: 'Test notification — reminders are working! 🔔',
      url: '/aviadmin',
      tag: 'aviad-test',
    })
    return Response.json({ ok: true, ...result })
  } catch (err: unknown) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
