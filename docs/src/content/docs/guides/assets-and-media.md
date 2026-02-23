---
title: Assets & Media
description: How to organize and use images, audio, and video in your game.
---

Doodle Engine games can include images, audio, and video. Assets are served as static files by the dev server and included in production builds.

## Project Structure

The scaffolded project includes these asset directories:

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

## Supported Formats

### Images

| Format | Use Case                                                    |
| ------ | ----------------------------------------------------------- |
| PNG    | Portraits, icons, UI elements (supports transparency)       |
| JPG    | Banners, backgrounds, photos                                |
| WebP   | Modern alternative to PNG/JPG (smaller files, wide support) |

### Audio

| Format | Use Case                                                   |
| ------ | ---------------------------------------------------------- |
| OGG    | Recommended for all audio (good compression, wide support) |
| MP3    | Alternative for music and voice (universal support)        |

### Video

| Format      | Use Case                                                   |
| ----------- | ---------------------------------------------------------- |
| MP4 (H.264) | Recommended for video playback (universal browser support) |
| WebM (VP9)  | Alternative with better compression (most modern browsers) |

## Referencing Assets in Content

Write bare filenames in YAML and DSL files. The engine resolves them to full paths based on the field type.

```yaml
# content/locations/tavern.yaml
banner: tavern.png          # → /assets/images/banners/tavern.png
music: tavern_ambience.ogg  # → /assets/audio/music/tavern_ambience.ogg
```

Resolution happens at snapshot build time. Components receive full paths and use them directly.

### Convention Table

| Field                                        | Resolves to                              |
| -------------------------------------------- | ---------------------------------------- |
| `location.banner`                            | `/assets/images/banners/{filename}`      |
| `location.music`                             | `/assets/audio/music/{filename}`         |
| `location.ambient`                           | `/assets/audio/sfx/{filename}`           |
| `character.portrait`                         | `/assets/images/portraits/{filename}`    |
| `item.icon`, `item.image`                    | `/assets/images/items/{filename}`        |
| `map.image`                                  | `/assets/images/maps/{filename}`         |
| `interlude.background`, `interlude.banner`   | `/assets/images/banners/{filename}`      |
| `interlude.music`                            | `/assets/audio/music/{filename}`         |
| `interlude.voice`                            | `/assets/audio/voice/{filename}`         |
| `interlude.sounds[]`                         | `/assets/audio/sfx/{filename}`           |
| DSL `MUSIC`                                  | `/assets/audio/music/{filename}`         |
| DSL `SOUND`                                  | `/assets/audio/sfx/{filename}`           |
| DSL `VOICE`                                  | `/assets/audio/voice/{filename}`         |
| DSL `VIDEO`                                  | `/assets/video/{filename}`               |

### Escape Hatch

If you need to reference a file outside the convention, use a path starting with `/` or `assets/`:

```yaml
banner: /assets/images/special/custom_layout.png
```

These paths are used as-is without modification.

### Shell Config Paths

Shell assets configured in `game.yaml` under `shell:` use full paths. They are not processed by the convention table above.

```yaml
shell:
  splash:
    logo: /assets/images/studio-logo.png
    background: /assets/images/splash-bg.jpg
    sound: /assets/audio/sfx/splash-sting.ogg
```

Content YAML files (locations, characters, items, and so on) use bare filenames that the engine resolves at snapshot time. Shell config paths are read directly by the asset loader before any game content is processed, so they must be complete.

### Location Banners

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
description: '@location.tavern.description'
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

### Character Portraits

```yaml
# content/characters/bartender.yaml
id: bartender
name: '@character.bartender.name'
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
```

### Item Images

```yaml
# content/items/old_coin.yaml
id: old_coin
name: '@item.old_coin.name'
description: '@item.old_coin.description'
icon: old_coin_icon.png
image: old_coin.png
```

- `icon`: small image shown in inventory grids and lists
- `image`: larger image shown in inspection or detail views

### Map Images

```yaml
# content/maps/town.yaml
id: town
name: '@map.town.name'
image: town_map.png
```

### Audio in Dialogues

```
MUSIC tension_theme.ogg
SOUND door_slam.ogg
VOICE bartender_greeting.ogg
```

### Video in Dialogues

```
VIDEO intro_cinematic.mp4
```

## Compression Tips

- Use compressed formats to keep downloads reasonable
- Trim silence from the beginning and end of audio files
- Avoid unnecessarily large images or long uncompressed video
- Prefer modern formats (WebP, OGG, WebM) when compatibility allows

## Bundled Assets

For most games, bundle all assets with your build. They are copied to `dist/` and served alongside the game. This works with static hosting, desktop wrappers, and typical web deployments.

## Loading Behavior

Doodle Engine prepares assets before the renderer depends on them. Portraits, banners, music, and other media are requested ahead of scene transitions so they are available when UI renders or playback begins.

Assets are divided into two loading tiers:

- **Shell assets** (logo, title screen, UI sounds) load before any screen renders
- **Game assets** (portraits, banners, music, items) load during the loading screen and are tracked by phase

See [Asset Loading](/guides/asset-loading/) for details on loading phases and configuration.
