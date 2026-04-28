/**
 * CareerOS Service Worker
 * Strategy:
 *   - App shell (HTML, JS, CSS, icons) → Cache First
 *   - API calls to Railway backend      → Network First (never cache)
 */

const CACHE_NAME = 'career-os-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
];

// ── Install: pre-cache the app shell ──────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route requests ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept non-GET or cross-origin API requests
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('railway.app') || url.pathname.startsWith('/api/')) return;

  // Network First for navigation (ensures fresh HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Cache First for static assets (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }
});
