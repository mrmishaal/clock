const PRECACHE_NAME = 'clock-precache-v1'
const RUNTIME_CACHE_NAME = 'clock-runtime-v1'
const PRECACHE_URLS = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== PRECACHE_NAME && key !== RUNTIME_CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  )
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PRECACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {})
          return response
        })
        .catch(async () => (await caches.match('/offline.html')) ?? (await caches.match('/index.html')) ?? Response.error()),
    )
    return
  }

  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchResponse = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => undefined)

      return cachedResponse ?? fetchResponse ?? Response.error()
    }),
  )
})
