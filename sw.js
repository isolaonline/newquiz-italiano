const CACHE_NAME = 'quiz-it-v1.2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate + cleanup
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Questions JSON - Stale-While-Revalidate
  if (url.pathname.startsWith('/data/questions')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(e.request).then(response => {
          cache.put(e.request, response.clone());
          return response;
        }).catch(() => {
          return cache.match(e.request).then(cached => {
            if (cached) return cached;
            return caches.match('/offline.html') || new Response('Offline', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // Shell assets - Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(fetched => {
        if (e.request.destination === 'document' || e.request.destination === 'script' || e.request.destination === 'style') {
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, fetched.clone()));
        }
        return fetched;
      });
    }).catch(() => {
      if (e.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
