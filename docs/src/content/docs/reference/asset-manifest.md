---
title: Asset Manifest
description: Structure of the asset manifest and how it is generated.
---

The **asset manifest** is a JSON list of the media files used by the game. It separates files into two loading tiers, or stages: shell assets load first, and game assets load with the main loading screen. `npm run build` writes the manifest to disk, and `npm run dev` creates it as needed.

## Structure

```json
{
    "version": "1734567890123",
    "shell": [
        {
            "path": "assets/images/studio-logo.png",
            "type": "image",
            "size": 42301,
            "tier": 1
        }
    ],
    "game": [
        {
            "path": "assets/images/banners/tavern-banner.jpg",
            "type": "image",
            "size": 185432,
            "tier": 2
        }
    ],
    "shellSize": 42301,
    "totalSize": 227733
}
```

### Fields

| Field       | Type           | Description                                    |
| ----------- | -------------- | ---------------------------------------------- |
| `version`   | `string`       | Build timestamp that tells browsers when cached assets have changed |
| `shell`     | `AssetEntry[]` | Tier 1 assets (shell screens), loaded first    |
| `game`      | `AssetEntry[]` | Tier 2 assets (gameplay), loaded with progress |
| `shellSize` | `number`       | Total bytes of shell assets                    |
| `totalSize` | `number`       | Total bytes of all assets                      |

Each `AssetEntry`:

| Field  | Type                            | Description                                      |
| ------ | ------------------------------- | ------------------------------------------------ |
| `path` | `string`                        | Asset path. Local assets usually start with `assets/`; external URLs are allowed. |
| `type` | `'image' \| 'audio' \| 'video'` | Determined from file extension                   |
| `size` | `number \| undefined`           | File size in bytes. Remote/data/blob URLs may omit size |
| `tier` | `1 \| 2`                        | Loading tier                                     |

## How Assets Are Discovered

The CLI scans these sources to build the manifest:

**Shell assets (tier 1)**: read from `config.shell` in `game.yaml`:

- `shell.splash.logo`, `shell.splash.background`, `shell.splash.sound`
- `shell.loading.background`
- `shell.title.logo`, `shell.title.background`, `shell.title.music`
- `shell.uiSounds.*`

**Game assets (tier 2)**: collected from the content registry, which is the loaded set of game content:

- `location.banner`, `location.music`, `location.ambient`
- `character.portrait`
- `item.icon`, `item.image`
- `map.image`
- `interlude.background`, `interlude.banner`, `interlude.music`, `interlude.voice`, `interlude.sounds[]`
- Media referenced by built-in dialogue effects: `MUSIC`, `SOUND`, `VIDEO`, and `INTERLUDE`
- `dialogueNode.voice`, `dialogueNode.portrait`

An asset already listed in the shell tier appears only there.

Empty strings and undefined fields are skipped.

Local asset paths under `assets/` must exist. `npm run build` fails when a referenced local asset is missing so broken media is caught before release. External `http`, `https`, `data`, and `blob` URLs are allowed and may not have byte sizes.

## The `/api/manifest` Endpoint

In development (`npm run dev`), each `GET /api/manifest` request generates the manifest. Its version is always `"dev"`, so the browser does not cache it as a production manifest.

In production (`npm run build`), the manifest is written to:

- `dist/api/manifest` (served at `/api/manifest`)
- `dist/asset-manifest.json` (human-readable copy)

## Types

```ts
import type { AssetManifest, AssetEntry } from '@doodle-engine/core';
```

Both types are exported from `@doodle-engine/core`.
