---
title: Assets & Media
description: How to organize and use images, audio, and video in your game.
---

Doodle Engine games can include images, audio, and video. The development server loads these files while you work, and production builds include them with the finished game.

## Project Structure

New projects include these asset directories:

```text
assets/
  images/
    banners/       # Location and interlude banner images
    portraits/     # Character portrait images
    items/         # Item icon and detail images
    maps/          # Map background images
  audio/
    music/         # Background music tracks
    sfx/           # Sound effects
    voice/         # Voice lines
    ui/            # UI sounds (clicks, menu sounds)
  video/           # Video files used by VIDEO effects
```

## Recommended Formats

The asset scanner recognizes common browser image, audio, and video extensions. These are good defaults for browser games.

### Images

| Format | Use Case                                                    |
| ------ | ----------------------------------------------------------- |
| PNG    | Portraits, icons, UI elements (supports transparency)       |
| JPG    | Banners, backgrounds, photos                                |
| WebP   | Modern alternative to PNG/JPG (smaller files, wide support) |

### Audio

| Format | Use Case                                                   |
| ------ | ---------------------------------------------------------- |
| OGG    | Good compression and broad browser support                 |
| MP3    | Widely supported option for music and voice                |

### Video

| Format      | Use Case                                                   |
| ----------- | ---------------------------------------------------------- |
| MP4 (H.264) | Widely supported option for video playback                |
| WebM (VP9)  | Alternative with better compression (most modern browsers) |

## Add Asset Filenames to Content

Place each file in the folder for its media type, then write only its filename in the matching content field. Doodle uses the field to find the correct folder.

```yaml
# content/locations/tavern.yaml
id: tavern
banner: tavern.png
music: tavern_ambience.ogg
```

Here, Doodle loads `tavern.png` from `assets/images/banners/` and `tavern_ambience.ogg` from `assets/audio/music/`.

### Convention Table

| Field                                        | Resolves to                              |
| -------------------------------------------- | ---------------------------------------- |
| `location.banner`                            | `assets/images/banners/{filename}`      |
| `location.music`                             | `assets/audio/music/{filename}`         |
| `location.ambient`                           | `assets/audio/sfx/{filename}`           |
| `character.portrait`                         | `assets/images/portraits/{filename}`    |
| `item.icon`, `item.image`                    | `assets/images/items/{filename}`        |
| `map.image`                                  | `assets/images/maps/{filename}`         |
| `interlude.background`, `interlude.banner`   | `assets/images/banners/{filename}`      |
| `interlude.music`                            | `assets/audio/music/{filename}`         |
| `interlude.voice`                            | `assets/audio/voice/{filename}`         |
| `interlude.sounds[]`                         | `assets/audio/sfx/{filename}`           |
| DSL `MUSIC`                                  | `assets/audio/music/{filename}`         |
| DSL `SOUND`                                  | `assets/audio/sfx/{filename}`           |
| DSL `VOICE`                                  | `assets/audio/voice/{filename}`         |
| DSL `VIDEO`                                  | `assets/video/{filename}`               |

### Custom Paths

If you need to reference a file outside the convention, write the path
yourself, starting with `assets/`:

```yaml
banner: assets/images/special/custom_layout.png
```

The engine uses that path as written. Paths can also begin with
`/` or a full `http(s)://` address. A leading `/` works only when the game is
hosted at the root of a domain, so an `assets/` path is usually more portable.

### Shell Config Paths

Shell assets configured in `game.yaml` under `shell:` use project-relative paths beginning with `assets/`. They are not processed by the convention table above.

```yaml
shell:
  splash:
    logo: assets/images/studio-logo.png
    background: assets/images/splash-bg.jpg
    sound: assets/audio/sfx/splash-sting.ogg
```

Content YAML files use bare filenames that the engine expands using the convention table. Shell settings name the complete path within the project instead.

### Location Banners

```yaml
# content/locations/tavern.yaml
id: tavern
name: The Salty Dog
description: A warm tavern overlooking the harbor.
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

### Character Portraits

```yaml
# content/characters/bartender.yaml
id: bartender
name: Marcus the Bartender
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
```

### Item Images

```yaml
# content/items/old_coin.yaml
id: old_coin
name: Old Coin
description: A salt-stained coin stamped with an unfamiliar crest.
icon: old_coin_icon.png
image: old_coin.png
```

- `icon`: small image shown in inventory grids and lists
- `image`: larger image shown in inspection or detail views

### Map Images

```yaml
# content/maps/town.yaml
id: town
name: Harbor Town
image: town_map.png
```

### Audio in Dialogues

```text
MUSIC tension_theme.ogg
SOUND door_slam.ogg
VOICE bartender_greeting.ogg
```

### Video in Dialogues

```text
VIDEO intro_cinematic.mp4
```

## Compression Tips

- Compress media to keep downloads reasonable
- Resize images to the largest dimensions the game displays
- Trim silence from the beginning and end of audio files
- Prefer modern formats (WebP, OGG, WebM) when compatibility allows

## Bundled Assets

For most games, bundle all assets with your build. They are copied to `dist/` and served alongside the game. This works with static hosting, desktop wrappers, and typical web deployments.

When you run `npm run build`, every referenced local asset under `assets/` must exist. The CLI copies the project `assets/` folder to `dist/assets/` and fails the build if content or shell config points at a missing local file.

## Loading Behavior

`GameShell` and `AssetProvider` prepare assets before gameplay begins. They load referenced media during startup so images and playback are ready when needed.

Assets load in two stages:

- **Shell assets** (splash, loading, title, UI sounds) load first
- **Game assets** (portraits, banners, music, video, items) load during the loading screen

See [Asset Loading](/technical/asset-loading/) for details on loading phases and configuration.
