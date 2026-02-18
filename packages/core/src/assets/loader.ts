/**
 * Framework-agnostic asset loading primitives.
 *
 * The default implementation uses fetch + Cache API for browsers.
 * Custom implementations can be provided for other environments
 * (e.g., desktop wrappers where assets are already local).
 */

const CACHE_NAME_PREFIX = "doodle-engine-assets-";

/**
 * Asset loader interface.
 */
export interface AssetLoader {
  /** Check if an asset is already cached/available */
  isAvailable(path: string): Promise<boolean>;

  /** Load a single asset, returns when ready */
  load(path: string): Promise<void>;

  /** Load multiple assets with progress callback */
  loadMany(
    paths: string[],
    onProgress?: (loaded: number, total: number, current: string) => void,
  ): Promise<void>;

  /** Get a URL that can be used in src attributes (may be blob URL or original) */
  getUrl(path: string): string;

  /** Preload assets that might be needed soon (non-blocking) */
  prefetch(paths: string[]): void;

  /** Clear all cached assets */
  clear(): Promise<void>;
}

/**
 * Create the default browser-based asset loader.
 *
 * Uses the Cache API when available (browser production).
 * Falls back to plain fetch (warms browser cache) when Cache API is unavailable.
 *
 * @param version - Cache version string; changing this busts the cache
 */
export function createAssetLoader(version: string = "1"): AssetLoader {
  const cacheName = `${CACHE_NAME_PREFIX}${version}`;
  const loaded = new Set<string>();
  const hasCache = typeof caches !== "undefined";

  async function getCache(): Promise<Cache | null> {
    if (!hasCache) return null;
    try {
      return await caches.open(cacheName);
    } catch {
      return null;
    }
  }

  async function loadAsset(path: string): Promise<void> {
    if (loaded.has(path)) return;

    const cache = await getCache();

    if (cache) {
      const existing = await cache.match(path);
      if (existing) {
        loaded.add(path);
        return;
      }

      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${path} (${response.status})`);
      }
      await cache.put(path, response);
    } else {
      // No Cache API — just fetch to warm up the browser's HTTP cache
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${path} (${response.status})`);
      }
    }

    loaded.add(path);
  }

  return {
    async isAvailable(path: string): Promise<boolean> {
      if (loaded.has(path)) return true;
      const cache = await getCache();
      if (!cache) return false;
      const match = await cache.match(path);
      return match !== undefined;
    },

    async load(path: string): Promise<void> {
      await loadAsset(path);
    },

    async loadMany(
      paths: string[],
      onProgress?: (loaded: number, total: number, current: string) => void,
    ): Promise<void> {
      let loadedCount = 0;
      const total = paths.length;

      for (const path of paths) {
        onProgress?.(loadedCount, total, path);
        await loadAsset(path);
        loadedCount++;
        onProgress?.(loadedCount, total, path);
      }
    },

    getUrl(path: string): string {
      return path;
    },

    prefetch(paths: string[]): void {
      for (const path of paths) {
        loadAsset(path).catch(() => {
          // Prefetch failures are non-fatal
        });
      }
    },

    async clear(): Promise<void> {
      loaded.clear();
      if (!hasCache) return;
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_NAME_PREFIX))
            .map((key) => caches.delete(key)),
        );
      } catch {
        // Clear failures are non-fatal
      }
    },
  };
}
