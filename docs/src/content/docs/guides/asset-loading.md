---
title: Asset Loading
description: How the asset loading system works, and how to configure shell assets.
---

Doodle Engine uses an asset loading system to prepare media before it is needed by the renderer. Portraits, banners, music, and other assets are requested ahead of scene transitions so they are available when the UI renders or playback begins.

This page is primarily useful for developers building custom renderers or modifying loading behavior. Content authors usually do not need to interact with the asset loader directly.

## How It Works

Assets are organized into tiers based on when they need to be available during startup and gameplay:

| Tier               | When loaded               | What it contains                                                                                     |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Tier 0**         | Bundled in JS             | CSS spinner, inline SVG                                                                              |
| **Tier 1 (shell)** | Before any screen renders | Splash/title/loading backgrounds, logos, UI sounds                                                   |
| **Tier 2 (game)**  | During the loading screen | All gameplay assets referenced by the manifest, including portraits, banners, music, and other media |

### The Loading Flow

```
1. LOADING  → download shell assets (tier 1), then game assets (tier 2) with progress
2. SPLASH   → studio logo (already loaded)
3. TITLE    → title screen with music (already loaded)
4. PLAYING  → game (game assets ready)
```

The loading screen uses CSS-only defaults (gradient background, animated spinner) so it renders immediately with zero external assets. It upgrades its appearance once shell assets arrive.

## Configuring Shell Assets

Add a `shell:` section to your `content/game.yaml`:

```yaml
shell:
  splash:
    logo: /assets/images/studio-logo.png
    background: /assets/images/splash-bg.jpg
    sound: /assets/audio/sfx/splash-sting.ogg
    duration: 2000

  loading:
    background: /assets/images/loading-bg.jpg

  title:
    logo: /assets/images/game-logo.png
    background: /assets/images/title-bg.jpg
    music: /assets/audio/music/title-theme.ogg

  uiSounds:
    click: /assets/audio/sfx/ui-click.ogg
    hover: /assets/audio/sfx/ui-hover.ogg
    menuOpen: /assets/audio/sfx/menu-open.ogg
    menuClose: /assets/audio/sfx/menu-close.ogg
```

All fields are optional. Screens render with built-in defaults when assets are not provided. Backgrounds fall back to styled gradients, logos fall back to text, and missing sounds are ignored.

## Customizing the Loading Screen

Pass a `renderLoading` prop to `GameShell` for complete control:

```tsx
<GameShell
  manifest={manifest}
  config={config}
  registry={registry}
  renderLoading={(state) => (
    <div className="my-loader">
      <p>{Math.round(state.overallProgress * 100)}%</p>
      <progress value={state.overallProgress} max={1} />
    </div>
  )}
/>
```

The `state` object includes:

```ts
{
  phase: "idle" | "loading-shell" | "loading-game" | "complete" | "error";
  bytesLoaded: number;
  bytesTotal: number;
  progress: number;
  overallProgress: number;
  currentAsset: string | null;
  error: string | null;
}
```

## Using Assets in Custom Renderers

When building a custom renderer (not using `GameShell`), wrap your app in `AssetProvider`:

```tsx
import { AssetProvider, useAsset } from "@doodle-engine/react";

function App() {
  return (
    <AssetProvider
      manifest={manifest}
      renderLoading={(state) => <LoadingScreen state={state} />}
    >
      <MyGame />
    </AssetProvider>
  );
}

function LocationBanner({ src }: { src: string }) {
  const { url, isReady } = useAsset(src);
  return <img src={url} style={{ opacity: isReady ? 1 : 0 }} />;
}
```

## Prefetching

Prefetch assets for upcoming screens to ensure smooth transitions:

```tsx
import { usePrefetch } from "@doodle-engine/react";

function TavernScene({ registry }) {
  usePrefetch([
    registry.locations.market.banner,
    registry.locations.market.music,
  ]);
}
```

## Service Worker

In production, `npm run build` generates a service worker (`dist/sw.js`) that precaches all manifest assets. Assets are cached on the first visit and typically load from cache on subsequent visits.

The service worker:

- Precaches all assets during install
- Serves assets from cache (cache-first strategy)
- Cleans old caches when a new build is deployed
- Does not intercept API calls (`/api/*`)

Service workers are only registered in production. Development uses the same loading flow but without caching.

## Non-Browser Environments

For desktop wrappers or file:// contexts where assets are already local, provide a custom loader:

```ts
import type { AssetLoader } from '@doodle-engine/core'

const localLoader: AssetLoader = {
  isAvailable: async () => true,
  load: async () => {},
  loadMany: async (paths, onProgress) => {
    paths.forEach((p, i) => onProgress?.(i + 1, paths.length, p))
  },
  getUrl: (path) => path,
  prefetch: () => {},
  clear: async () => {},
}

<GameShell assetLoader={localLoader} ... />
```
