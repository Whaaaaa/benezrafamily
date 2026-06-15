// Browser-side helpers for enabling/disabling web-push reminders.

export type PushState = 'unsupported' | 'denied' | 'disabled' | 'enabled' | 'unconfigured'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.getRegistration('/aviadmin-sw.js')
    const sub = reg ? await reg.pushManager.getSubscription() : null
    return sub ? 'enabled' : 'disabled'
  } catch {
    return 'disabled'
  }
}

export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'

  const keyRes = await fetch('/api/aviadmin/push/public-key').then(r => r.json())
  if (!keyRes?.publicKey) return 'unconfigured'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'disabled'

  const reg = await navigator.serviceWorker.register('/aviadmin-sw.js')
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey) as BufferSource,
    })
  }

  await fetch('/api/aviadmin/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  })
  return 'enabled'
}

export async function disablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  const reg = await navigator.serviceWorker.getRegistration('/aviadmin-sw.js')
  const sub = reg ? await reg.pushManager.getSubscription() : null
  if (sub) {
    await fetch('/api/aviadmin/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
  }
  return 'disabled'
}
