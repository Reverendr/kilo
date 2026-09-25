// Imported by the generated service worker: tapping the end-of-rest notification brings Kilo back.
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = all.find(c => 'focus' in c)
    if (client) return client.focus()
    return self.clients.openWindow('/')
  })())
})
