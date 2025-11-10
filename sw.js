// sw.js – versione FIXATA per iOS (zero falsi offline)
const CACHE_NAME = 'quiz-it-v1.3';
const DATA_CACHE = 'quiz-data-v1';

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

// INSTALL → precache shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE → pulisci vecchie cache
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE) {
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// FETCH → strategia perfetta per iOS
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. Gestione speciale per questions*.json
  if (url.pathname.startsWith('/data/questions') || url.pathname.endsWith('.json')) {
    e.respondWith(
      // Prova prima la cache
      caches.open(DATA_CACHE).then(cache => {
        return cache.match(e.request).then(cached => {
          // Se c’è in cache → usala subito (veloce offline)
          if (cached) {
            // …ma aggiorna in background per la prossima volta
            fetch(e.request).then(fresh => cache.put(e.request, fresh));
            return cached;
          }

          // Se NON c’è in cache → prova rete
          return fetch(e.request).then(fresh => {
            cache.put(e.request, fresh.clone());
            return fresh;
          }).catch(() => {
            // Solo qui sei davvero offline e senza dati
            return new Response(
              JSON.stringify({ error: 'offline-no-data' }),
              { headers: { 'Content-Type': 'application/json' }}
            );
          });
        });
      })
    );
    return;
  }

  // 2. Tutto il resto (HTML, CSS, JS, icone) → Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => caches.match('/index.html'));
    })
  );
});
