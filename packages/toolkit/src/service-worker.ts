/**
 * Service worker generator.
 *
 * The generated worker makes a built game playable offline after the first
 * visit. It caches three kinds of things:
 *
 *   - the app shell: index.html and the bundled scripts and styles
 *   - the content endpoints: api/content and api/manifest
 *   - the game's media files, from the asset manifest
 *
 * All cached paths are written relative to the worker's own location, so the
 * same build works at a domain root or under any folder.
 */

import type { AssetManifest } from '@doodle-engine/core';

/**
 * Generate service worker source code.
 *
 * @param manifest - The asset manifest (media files to cache)
 * @param shellFiles - The files Vite wrote for the app itself (index.html,
 * bundled js/css), as paths relative to the output folder
 */
export function generateServiceWorker(
    manifest: AssetManifest,
    shellFiles: string[] = []
): string {
    const cacheName = `doodle-engine-${manifest.version}`;

    // Media paths from the manifest. Only files that live in the build's own
    // assets folder can be precached; outside URLs are fetched as needed.
    const mediaPaths = [
        ...manifest.shell.map((e) => e.path),
        ...manifest.game.map((e) => e.path),
    ].filter((p) => p.startsWith('assets/') || p.startsWith('/assets/'));

    const precache = [
        ...shellFiles,
        'api/content',
        'api/manifest',
        ...mediaPaths,
    ];

    const precacheList = JSON.stringify(precache, null, 2);

    return `/**
 * Doodle Engine Service Worker
 * Generated at build time. Do not edit manually.
 * Cache version: ${manifest.version}
 */

const CACHE_NAME = ${JSON.stringify(cacheName)};

// Every path is resolved against this worker's own location, so the build
// works at a domain root or under any folder.
const PRECACHE_URLS = ${precacheList}.map(
  (path) => new URL(path, self.location).pathname
);
const INDEX_URL = new URL('index.html', self.location).pathname;
const API_URLS = ['api/content', 'api/manifest'].map(
  (path) => new URL(path, self.location).pathname
);

// Install: cache the app, the content, and the media
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache files one at a time so one failure doesn't block everything
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

// Activate: clean up caches from older builds
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('doodle-engine-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Page loads: try the network for a fresh copy, fall back to the cached
  // page so the game still opens offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL, copy));
          return response;
        })
        .catch(() =>
          caches.match(INDEX_URL).then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Content endpoints: prefer fresh content, fall back to the cache offline.
  if (API_URLS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || Response.error())
        )
    );
    return;
  }

  // Everything else (bundles, media): cached copy first, network otherwise.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok && PRECACHE_URLS.includes(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return response;
      });
    })
  );
});
`;
}
