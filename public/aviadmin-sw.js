/* Service worker for Avi Calendar push reminders */
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Avi Calendar'
  const options = {
    body: data.body || '',
    icon: '/hero.jpg',
    badge: '/hero.jpg',
    tag: data.tag,
    data: { url: data.url || '/aviadmin' },
    vibrate: [100, 50, 100],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/aviadmin'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/aviadmin') && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
