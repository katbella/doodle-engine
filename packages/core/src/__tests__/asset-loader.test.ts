/**
 * Tests for the browser asset loader.
 *
 * We use a mock fetch and a mock Cache API to test the loader in isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAssetLoader } from "../assets/loader";

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makeResponse(ok = true) {
  return {
    ok,
    status: ok ? 200 : 404,
    clone: () => makeResponse(ok),
  } as unknown as Response;
}

function makeCacheApi() {
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (path: string) => store.get(path) ?? undefined),
    put: vi.fn(async (path: string, response: Response) => {
      store.set(path, response);
    }),
    delete: vi.fn(async (path: string) => store.delete(path)),
  };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ["doodle-engine-assets-1"]),
    delete: vi.fn(async () => true),
  };
  return { cache, caches, store };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createAssetLoader", () => {
  let cacheApi: ReturnType<typeof makeCacheApi>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cacheApi = makeCacheApi();
    fetchMock = vi.fn(async (_path: string) => makeResponse(true));

    // Inject globals
    (globalThis as any).caches = cacheApi.caches;
    (globalThis as any).fetch = fetchMock;
  });

  it("isAvailable returns false for uncached assets", async () => {
    const loader = createAssetLoader("1");
    const available = await loader.isAvailable("/assets/foo.png");
    expect(available).toBe(false);
  });

  it("load fetches and caches an asset", async () => {
    const loader = createAssetLoader("1");
    await loader.load("/assets/foo.png");
    expect(fetchMock).toHaveBeenCalledWith("/assets/foo.png");
    expect(cacheApi.cache.put).toHaveBeenCalled();
  });

  it("isAvailable returns true after loading", async () => {
    const loader = createAssetLoader("1");
    await loader.load("/assets/foo.png");
    const available = await loader.isAvailable("/assets/foo.png");
    expect(available).toBe(true);
  });

  it("load does not re-fetch already loaded assets", async () => {
    const loader = createAssetLoader("1");
    await loader.load("/assets/foo.png");
    await loader.load("/assets/foo.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("loadMany calls progress callback", async () => {
    const loader = createAssetLoader("1");
    const paths = ["/assets/a.ogg", "/assets/b.ogg", "/assets/c.ogg"];
    const progress = vi.fn();
    await loader.loadMany(paths, progress);
    // Called once before and once after each asset
    expect(progress).toHaveBeenCalledTimes(paths.length * 2);
  });

  it("loadMany passes correct loaded count to progress callback", async () => {
    const loader = createAssetLoader("1");
    const paths = ["/assets/a.ogg", "/assets/b.ogg"];
    const calls: [number, number, string][] = [];
    await loader.loadMany(paths, (loaded, total, current) => {
      calls.push([loaded, total, current]);
    });
    // Before first: loaded=0, After first: loaded=1, Before second: loaded=1, After second: loaded=2
    expect(calls[0][0]).toBe(0);
    expect(calls[1][0]).toBe(1);
    expect(calls[2][0]).toBe(1);
    expect(calls[3][0]).toBe(2);
  });

  it("getUrl returns the original path", () => {
    const loader = createAssetLoader("1");
    expect(loader.getUrl("/assets/foo.png")).toBe("/assets/foo.png");
  });

  it("prefetch loads assets non-blocking", async () => {
    const loader = createAssetLoader("1");
    loader.prefetch(["/assets/foo.png", "/assets/bar.ogg"]);
    // Give microtasks a tick to process
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledWith("/assets/foo.png");
    expect(fetchMock).toHaveBeenCalledWith("/assets/bar.ogg");
  });

  it("load throws on non-ok response", async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(false));
    const loader = createAssetLoader("1");
    await expect(loader.load("/assets/missing.png")).rejects.toThrow("404");
  });

  it("clear removes cached assets", async () => {
    const loader = createAssetLoader("1");
    await loader.load("/assets/foo.png");
    await loader.clear();
    expect(cacheApi.caches.delete).toHaveBeenCalled();
    // After clear, isAvailable should return false (internal set cleared, cache deleted)
    cacheApi.cache.match.mockResolvedValueOnce(undefined);
    const available = await loader.isAvailable("/assets/foo.png");
    expect(available).toBe(false);
  });
});
