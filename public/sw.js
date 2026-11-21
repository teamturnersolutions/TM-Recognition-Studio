/* TM Recognition Studio Service Worker
 * Strictly caches ONLY static application shell assets and read-only template packages.
 * Never caches blob:, data:, POST requests, or any user recognition data.
 */
const CACHE_NAME = 'tm-spotlight-studio-v0.2.0';

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-64.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-bjs.png',
  '/templates/index.json',
  '/templates/bjs-spotlight/manifest.json',
  '/templates/bjs-spotlight/nominees-background-modified.jpg',
  '/templates/bjs-spotlight/winner-background-modified.jpg',
  '/templates/bjs-spotlight/fonts/inter-latin-400-normal.woff2',
  '/templates/bjs-spotlight/fonts/inter-latin-400-italic.woff2',
  '/templates/bjs-spotlight/fonts/inter-latin-600-normal.woff2',
  '/templates/bjs-spotlight/fonts/inter-latin-700-normal.woff2',
  /* __PRECACHE_ASSETS__ */
];

function isApprovedCachePath(pathname) {
  return (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/templates/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((staleKey) => caches.delete(staleKey)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (!isApprovedCachePath(url.pathname)) {
    return;
  }

  // Network-first for HTML documents and template manifests/index so updates propagate cleanly while remaining offline-capable.
  const isDynamicMeta =
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.pathname.endsWith('.json');

  if (isDynamicMeta) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Offline resource unavailable', { status: 503 });
          }),
        ),
    );
    return;
  }

  // Cache-first for immutable hashed assets, icons, template backgrounds, and local fonts.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    }),
  );
});
