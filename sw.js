const CACHE = 'QUIZ_IT_v1';
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => {
    if (k !== CACHE) return caches.delete(k);
  }))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/data/')) {
    // Stale-while-revalidate per i JSON domande
    e.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(networkRes => {
        if (networkRes.ok) cache.put(e.request, networkRes.clone());
        return networkRes;
      }).catch(() => cached); // fallback cache
      return cached || fetchPromise;
    }));
    return;
  }
  // Cache-first per shell
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
