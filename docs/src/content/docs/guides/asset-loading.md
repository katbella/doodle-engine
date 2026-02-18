---
title: Asset Loading
description: How the asset loading system works, and how to configure shell assets.
---

Doodle Engine loads all game assets before they're needed. Dialogue portraits are ready before a conversation starts, music is loaded before entering a location, and cutscenes play without buffering delays. No pop-in, no audio gaps, no flicker when moving between scenes.

## How It Works

Assets are organized into **tiers** based on when they need to be available:

| Tier | When loaded | What it contains |
|------|-------------|-----------------|
| **Tier 0** | Bundled in JS | CSS spinner, inline SVG |
| **Tier 1 (shell)** | Before any screen renders | Splash/title/loading backgrounds, logos, UI sounds |
| **Tier 2 (game)** | During the loading screen | All gameplay assets — portraits, banners, music, etc. |

### The Loading Flow

```
1. LOADING  → download shell assets (tier 1), then game assets (tier 2) with progress
2. SPLASH   → studio logo (already cached)
3. TITLE    → title screen with music (already cached)
4. PLAYING  → game (all assets already cached)
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

All fields are optional. Screens render gracefully with no assets — styled gradients replace missing backgrounds, title text replaces missing logos, and missing sounds are skipped silently.

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
  phase: 'idle' | 'loading-shell' | 'loading-game' | 'complete' | 'error'
  bytesLoaded: number
  bytesTotal: number
  progress: number        // 0-1 for current phase
  overallProgress: number // 0-1 across all phases
  currentAsset: string | null
  error: string | null
}
```

## Using Assets in Custom Renderers

When building a custom renderer (not using `GameShell`), wrap your app in `AssetProvider`:

```tsx
import { AssetProvider, useAsset } from '@doodle-engine/react'

function App() {
  return (
    <AssetProvider
      manifest={manifest}
      renderLoading={(state) => <LoadingScreen state={state} />}
    >
      <MyGame />
    </AssetProvider>
  )
}

function LocationBanner({ src }: { src: string }) {
  const { url, isReady } = useAsset(src)
  return <img src={url} style={{ opacity: isReady ? 1 : 0 }} />
}
```

## Prefetching

Prefetch assets for upcoming screens to ensure instant transitions:

```tsx
import { usePrefetch } from '@doodle-engine/react'

function TavernScene({ registry }) {
  // Prefetch the market assets while the player is at the tavern
  usePrefetch([
    registry.locations.market.banner,
    registry.locations.market.music,
  ])
  // ...
}
```

## Service Worker

In production, `npm run build` generates a service worker (`dist/sw.js`) that precaches all manifest assets. Assets are cached on the first visit and load instantly on return visits.

The service worker:
- Precaches all assets during install
- Serves assets from cache (cache-first strategy)
- Cleans old caches when a new build is deployed
- Does not intercept API calls (`/api/*`)

Service workers are only registered in production. Development uses the same loading flow but without caching.

## Non-Browser Environments

For desktop wrappers or file:// contexts where assets are already local, provide a custom loader:

```ts
import { createAssetLoader } from '@doodle-engine/core'
import type { AssetLoader } from '@doodle-engine/core'

// Assets are available locally — no fetching needed
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
