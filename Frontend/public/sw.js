// ============================================================
// FILE: public/sw.js
//
// FarmXpert Service Worker — Production PWA
//
// Cache strategy:
//   - CACHE FIRST: Immutable static assets (JS, CSS, fonts, images)
//   - NETWORK ONLY: All API requests, auth, POST/PUT/PATCH/DELETE
//   - NETWORK FIRST: Navigation requests (HTML pages)
//   - Offline fallback: /offline page when navigation fails
//
// IMPORTANT:
//   - NEVER caches API responses (auth, user data, farm data, etc.)
//   - NEVER caches POST/PUT/PATCH/DELETE requests
//   - Uses versioned cache names for safe updates
// ============================================================

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `farmxpert-static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `farmxpert-offline-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Static assets to precache on install
const PRECACHE_URLS = [
  OFFLINE_URL,
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately — don't wait for existing tabs to close
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
// Clean up old caches when a new version is deployed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== OFFLINE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1. Skip non-GET requests entirely (POST, PUT, PATCH, DELETE) ──
  if (request.method !== 'GET') return;

  // ── 2. Skip API requests — NEVER cache authenticated/dynamic data ──
  // This covers both same-origin /api/* and cross-origin API calls
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/v1/') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // ── 3. Skip Next.js data requests (RSC payloads, JSON) ──
  if (url.pathname.includes('/_next/data/')) return;

  // ── 4. Cache First: Next.js immutable static assets ──
  // /_next/static/* files have content hashes → safe to cache forever
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── 5. Cache First: Static files in /icons/, /images/ ──
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // ── 6. Network First: Navigation requests (HTML pages) ──
  // Try the network first; fall back to the offline page on failure
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) => cached || new Response('Offline', { status: 503 })
        )
      )
    );
    return;
  }

  // ── 7. Everything else: network with no caching ──
  // (fonts loaded from Google CDN are cross-origin → skipped at step 2)
});

// ── Message handling ─────────────────────────────────────────
// Allow the app to request a SW update check
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
