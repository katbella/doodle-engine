/**
 * Service worker generator for offline asset caching.
 *
 * Generates a self-contained service worker script that:
 * - Precaches all manifest assets on install
 * - Serves cached assets on fetch (cache-first strategy)
 * - Cleans up old caches on activate
 */

import type { AssetManifest } from '@doodle-engine/core'

/**
 * Generate service worker source code for a given asset manifest.
 */
export function generateServiceWorker(manifest: AssetManifest): string {
  const cacheName = `doodle-engine-assets-${manifest.version}`
  const allPaths = [
    ...manifest.shell.map((e) => e.path),
    ...manifest.game.map((e) => e.path),
  ]

  const precacheList = JSON.stringify(allPaths, null, 2)

  return `/**
 * Doodle Engine Service Worker
 * Generated at build time — do not edit manually.
 * Cache version: ${manifest.version}
 */

const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${precacheList};

// Install: precache all manifest assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache assets individually so one failure doesn't block everything
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[sw] Failed to precache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('doodle-engine-assets-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for precached assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip API and non-asset requests — serve from network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache successful responses for precached paths
        if (response.ok && PRECACHE_URLS.includes(url.pathname)) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      });
    })
  );
});
`
}
