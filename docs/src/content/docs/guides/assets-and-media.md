---
title: Assets & Media
description: How to organize and use images, audio, and video in your game.
---

Doodle Engine games can include images, audio, and video. Assets are served as static files by the Vite dev server and included in production builds.

## Project Structure

The scaffolded project includes these asset directories:

```text
assets/
  images/
    banners/       # Location banner images and interlude banners
    portraits/     # Character portrait images
    items/         # Item icon and detail images
    maps/          # Map background images
  audio/
    music/         # Background music tracks
    sfx/           # Sound effects
    voice/         # Voice lines
    ui/            # UI sounds (clicks, menu sounds)
  video/           # Cutscene or interlude video files
```

Asset paths referenced in content are resolved relative to the configured asset base path (by default, the `assets/` directory).

## Supported Formats

### Images

| Format | Use Case |
|--------|----------|
| PNG | Portraits, icons, UI elements (supports transparency) |
| JPG | Banners, backgrounds, photos |
| WebP | Modern alternative to PNG/JPG (smaller files, wide support) |

### Audio

| Format | Use Case |
|--------|----------|
| OGG | Recommended for all audio (good compression, wide support) |
| MP3 | Alternative for music and voice (universal support) |

### Video

| Format | Use Case |
|--------|----------|
| MP4 (H.264) | Recommended for cutscenes (universal browser support) |
| WebM (VP9) | Alternative with better compression (most modern browsers) |

## Referencing Assets in Content

### Location Banners

```yaml
# content/locations/tavern.yaml
id: tavern
name: "@location.tavern.name"
description: "@location.tavern.description"
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

Banner images are referenced by filename. The renderer loads them from the configured image path.

### Character Portraits

```yaml
# content/characters/bartender.yaml
id: bartender
name: "@character.bartender.name"
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
```

### Item Images

```yaml
# content/items/old_coin.yaml
id: old_coin
name: "@item.old_coin.name"
description: "@item.old_coin.description"
icon: old_coin_icon.png
image: old_coin.png
```

- `icon`: small image shown in inventory grids and lists  
- `image`: larger image shown in inspection or detail views  

### Map Images

```yaml
# content/maps/town.yaml
id: town
name: "@map.town.name"
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

Interludes may also reference images or video depending on configuration.

## Compression Tips

- Use compressed formats to keep downloads reasonable
- Trim silence from the beginning and end of audio files
- Avoid unnecessarily large images or long uncompressed video
- Prefer modern formats (WebP, OGG, WebM) when compatibility allows

## Bundled vs External Assets

For most games, bundle all assets with your build. They're copied to `dist/` and served alongside the game. This is the simplest approach and works with any hosting.

For games with large media libraries (many music tracks, extensive voice acting, or video cutscenes), consider hosting media externally on a CDN:

```tsx
<GameShell
  audioOptions={{ audioBasePath: 'https://cdn.example.com/audio' }}
  videoBasePath="https://cdn.example.com/video"
/>
```

## Loading Behavior

Doodle Engine preloads assets before they're needed. Portraits are ready before a conversation starts, music loads before entering a location, and cutscenes play without buffering delays.

Assets are divided into two loading tiers:

- **Shell assets** (logo, title screen, UI sounds) load before any screen renders
- **Game assets** (portraits, banners, music, items) load during the loading screen, tracked by phase

See [Asset Loading](./asset-loading.md) for how to configure what loads when.
