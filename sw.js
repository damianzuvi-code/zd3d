const CACHE_NAME = 'zd3d-cache-v3';
const urlsToCache = [
  './index.html',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Eliminar cachés de versiones anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar llamadas a Google Apps Script ni otros orígenes (datos siempre frescos)
  if (url.origin !== self.location.origin) return;

  // HTML / navegación: red primero, caché como respaldo (así las actualizaciones llegan)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Estáticos: caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request).then(netRes => {
        const copy = netRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return netRes;
      }))
  );
});
