---
title: Assets & Media
description: How to organize and use images, audio, and video in your game.
---

Doodle Engine games can include images, audio, and video. Assets are served as static files by the Vite dev server and included in production builds.

## Project Structure

The scaffolded project includes these asset directories:

```
assets/
  images/
    banners/       # Location banner images
    portraits/     # Character portrait images
    items/         # Item icon and detail images
    maps/          # Map background images
  audio/
    music/         # Background music tracks
    sfx/           # Sound effects
    voice/         # Voice lines
    ui/            # UI sounds (clicks, menu sounds)
  video/           # Cutscene video files
```

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

- `icon`: small image shown in inventory grid
- `image`: larger image shown in the inspection modal

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

## Image Optimization Tips

- **Banners**: 1200x400px or similar wide aspect ratio, JPG at 80% quality
- **Portraits**: 200x200px to 400x400px, PNG for transparency or JPG for photos
- **Item icons**: 64x64px to 128x128px, PNG with transparency
- **Item detail images**: 400x400px, PNG or JPG
- **Map images**: Size to fit your map layout, JPG for photos or PNG for illustrated maps
- Use WebP where possible for 25-35% smaller files than PNG/JPG

## Audio Compression Tips

- **Music**: OGG at 128-192 kbps (good quality, reasonable size)
- **Sound effects**: OGG at 96-128 kbps (short files, quality matters less)
- **Voice lines**: OGG at 96-128 kbps (speech compresses well)
- **UI sounds**: OGG at 64-96 kbps (very short clips)
- Keep music tracks under 5 MB each when possible
- Trim silence from the beginning and end of all audio files

## Bundled vs External Assets

For most games, bundle all assets with your build. They're copied to `dist/` and served alongside the game. This is the simplest approach and works with any hosting.

For games with large media libraries (many music tracks, extensive voice acting, video cutscenes), consider hosting media externally on a CDN:

```tsx
<GameShell
  audioOptions={{ audioBasePath: 'https://cdn.example.com/audio' }}
  videoBasePath="https://cdn.example.com/video"
/>
```

## Loading Behavior

Assets are loaded by the browser as needed. There's no built-in preloading or streaming system. The browser handles caching automatically.

- **Images**: Loaded when the component renders (location change, inventory open, etc.)
- **Audio**: Loaded when playback is triggered (location music, sound effects, voice)
- **Video**: Loaded when the `VideoPlayer` component mounts (streamed by the browser)

For a smoother experience, keep file sizes reasonable and consider using compressed formats.
