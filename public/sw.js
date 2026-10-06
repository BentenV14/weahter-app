const VERSION = 'atmos-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const shell = [
  '/weather',
  '/hourly',
  '/daily',
  '/settings',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(shell)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('atmos-') && ![SHELL, ASSETS].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(url.pathname)) ||
            (await caches.match('/weather')) ||
            (await caches.match('/offline.html')),
        ),
    );
    return;
  }
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/maplibre/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(ASSETS);
              await cache.put(request, response.clone());
              const keys = await cache.keys();
              if (keys.length > 150) await cache.delete(keys[0]);
            }
            return response;
          }),
      ),
    );
  }
});
