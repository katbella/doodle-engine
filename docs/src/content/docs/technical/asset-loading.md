---
title: Asset Loading
description: How the asset loading system works, and how to configure shell assets.
---

Doodle loads every media file listed in the asset manifest before the game shell appears. The asset manifest is the generated list of images, audio, and video referenced by the project.

This page explains startup loading for developers changing `GameShell` or building a custom renderer. For adding media to game content, see [Assets & Media](/guides/assets-and-media/).

## How It Works

The manifest separates files into two groups:

| Group | Includes |
| --- | --- |
| **Shell assets** | Splash, loading, and title images; title music; splash and interface sounds |
| **Game assets** | Location and interlude art, portraits, item and map images, game music and sound, voice, and video |

`AssetProvider` loads the shell group first and the game group second. Its loading screen remains visible during both groups. The provider renders the game only after both groups finish, so the optional splash screen, title screen, and gameplay all begin with their referenced media available.

The screen order is:

1. Loading screen while shell and game media load
2. Optional splash screen
3. Title screen
4. Gameplay after the player starts or continues a game

The default loading screen is rendered with CSS, so it can appear before any media finishes loading. A background configured for the loading screen is included in the shell group.

## Configuring Shell Assets

Add a `shell:` section to your `content/game.yaml`:

```yaml
shell:
    splash:
        logo: assets/images/studio-logo.png
        background: assets/images/splash-bg.jpg
        sound: assets/audio/sfx/splash-sting.ogg
        duration: 2000

    loading:
        background: assets/images/loading-bg.jpg

    title:
        logo: assets/images/game-logo.png
        background: assets/images/title-bg.jpg
        music: assets/audio/music/title-theme.ogg

    uiSounds:
        click: assets/audio/ui/click.ogg
        hover: assets/audio/ui/hover.ogg
        menuOpen: assets/audio/ui/menu_open.ogg
        menuClose: assets/audio/ui/menu_close.ogg
```

All fields are optional. Screens use their built-in presentation when an image or sound is omitted. Use project-relative paths beginning with `assets/`; the build checks that each referenced local file exists.

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
    phase: 'idle' | 'loading-shell' | 'loading-game' | 'complete' | 'error';
    bytesLoaded: number;
    bytesTotal: number;
    assetsLoaded: number;
    assetsTotal: number;
    progress: number;
    overallProgress: number;
    currentAsset: string | null;
    error: string | null;
}
```

## Loading Assets for a Custom Renderer

Wrap a custom renderer in `AssetProvider` to use the same startup loading. Its children render after every manifest entry is ready:

```tsx
import { AssetProvider } from '@doodle-engine/react';

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
```

## Service Worker

For a release build, `npm run build` generates `dist/sw.js`. This service worker is a browser script that caches the application, content, and media for offline use after the player’s first visit.

The service worker:

- Caches the application files, `/api/content`, `/api/manifest`, and local manifest media
- Uses the network first for page navigation and content, with the cache available offline
- Uses cached copies of bundles and media when available
- Removes caches from older builds

The service worker is registered only by release builds. During development, `AssetProvider` still performs the same two-group startup load. The browser may retain those requests in its normal cache.

## Custom Asset Loaders

Doodle’s default loader uses browser `fetch` and the browser Cache API. Web builds and desktop or mobile wrappers that display the web build through a local server can use it unchanged.

Pass a custom `AssetLoader` when the application runs in a host that retrieves or caches media differently, or when a test needs to replace network loading. The loader must provide methods for loading one or many paths, reporting availability, returning a usable URL, and clearing its cache:

```tsx
import type { AssetLoader } from '@doodle-engine/core';

const localLoader: AssetLoader = {
    isAvailable: async () => true,
    load: async () => {},
    loadMany: async (paths, onProgress) => {
        paths.forEach((path, index) =>
            onProgress?.(index + 1, paths.length, path)
        );
    },
    getUrl: (path) => path,
    prefetch: () => {},
    clear: async () => {},
};

<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    assetLoader={localLoader}
/>
```

The `prefetch` method remains part of the loader interface for custom loading strategies. The default `AssetProvider` already loads the complete manifest before rendering the game, so normal Doodle projects do not need to call it.
