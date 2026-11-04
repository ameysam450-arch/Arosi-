// Offline shell for عکس‌کاو. The app has no backend: once the bundle, styles and
// icons are cached, analysis keeps working with no network at all.
// Registered only in production builds (see src/main.jsx) so it never fights the
// Vite dev server or HMR.
const CACHE = 'photokav-v1'
const SHELL = new URL('./', self.registration.scope).href

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

async function put(cacheKey, response) {
  const cache = await caches.open(CACHE)
  await cache.put(cacheKey, response)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Pages: network first, cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) {
            await put(SHELL, res.clone())
            return res
          }
          throw new Error('bad status')
        } catch {
          const cached = (await caches.match(req)) || (await caches.match(SHELL))
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // Static assets: serve from cache immediately, refresh in the background.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      const network = fetch(req)
        .then(async (res) => {
          if (res.ok) await put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })(),
  )
})
