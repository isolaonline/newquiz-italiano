const CACHE_NAME = 'QUIZ_IT_v3';
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Stale-While-Revalidate per /data/ (dataset)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/data/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then(res => {
        cache.put(event.request, res.clone()); return res;
      }).catch(()=>null);
      return cached || network || new Response(JSON.stringify({
        error:'offline', message:'Sei offline — ricarica quando torni online.'
      }), { headers:{'Content-Type':'application/json'}, status:200 });
    })());
    return;
  }

  // Cache-first per tutto il resto della shell
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
