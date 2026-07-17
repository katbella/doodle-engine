---
title: Audio
description: How to add music, ambient sounds, voice lines, and sound effects.
---

Doodle Engine supports location music, ambient sound, voice lines, and sound effects. `GameShell` handles playback. Custom React renderers can use `useAudioManager`.

## Setting Up Audio

### Location Music and Ambient

Each location has `music` and `ambient` fields:

```yaml
# content/locations/tavern.yaml
id: tavern
name: The Salty Dog
description: A warm tavern overlooking the harbor.
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

With GameShell or `useAudioManager`, music crossfades when `snapshot.music` changes.

### Voice Lines

Add voice to dialogue nodes:

```text
NODE emotional_scene
  VOICE bartender_sad.ogg
  BARTENDER: I thought we had more time.
```

### Sound Effects

Play one-shot sounds from dialogue effects:

```text
SOUND door_slam.ogg
```

### Music Override

Override the current music track from within dialogue:

```text
MUSIC tension_theme.ogg
```

The override clears when the player travels to a new location and the destination's location music resumes. To reset immediately to the current location's music, pass an empty string:

```text
MUSIC
```

## useAudioManager Hook

The `useAudioManager` hook watches the current snapshot, which is the engine's description of the current game screen, and updates audio playback to match it. Pass the current volume values each time the renderer runs so changes take effect immediately.

Store volume settings in `AudioSettingsContext` or your own application state, then pass them to the hook.

```tsx
import { useAudioManager, useAudioSettings } from '@doodle-engine/react';

function MyGame() {
    const { snapshot } = useGame();
    const audioSettings = useAudioSettings();

    useAudioManager(snapshot, {
        masterVolume: audioSettings.masterVolume,
        musicVolume: audioSettings.musicVolume,
        soundVolume: audioSettings.soundVolume,
        voiceVolume: audioSettings.voiceVolume,
        crossfadeDuration: 1000,
    });
}
```

`GameShell` calls `useAudioManager` for you.

### Options

| Option              | Type     | Default | Description                |
| ------------------- | -------- | ------- | -------------------------- |
| `masterVolume`      | `number` | `1.0`   | Master volume (0-1)        |
| `musicVolume`       | `number` | `0.7`   | Music channel volume (0-1) |
| `soundVolume`       | `number` | `0.8`   | Sound effects volume (0-1) |
| `voiceVolume`       | `number` | `1.0`   | Voice channel volume (0-1) |
| `crossfadeDuration` | `number` | `1000`  | Crossfade time in ms       |

### Returns

```typescript
interface AudioManagerControls {
    stopAll: () => void;
}
```

## How It Works

The hook reacts to snapshot changes:

- **Music**: When `snapshot.music` changes, crossfades to the new track
- **Ambient**: When `snapshot.ambient` changes, loops the new ambient track
- **Voice**: When `snapshot.dialogue?.voice` changes, plays the voice file
- **Sounds**: Plays all entries in `snapshot.pendingSounds` (cleared after each snapshot)

Sound effects appear in one snapshot and clear after playback begins.

## File Organization

Place audio files in the matching `assets/audio/` subdirectory:

```text
assets/
  audio/
    music/
      tavern_ambience.ogg
      market_bustle.ogg
      tension_theme.ogg
    sfx/
      door_slam.ogg
    voice/
      bartender_greeting.ogg
```

Write only the filename in game content. Doodle knows that a location’s `music` field refers to `assets/audio/music/`, while `ambient` refers to `assets/audio/sfx/`. See [Assets & Media](/guides/assets-and-media/) for every media field and folder.

## UI Sounds

The separate `useUISounds` hook handles interface sounds such as button clicks and menus opening or closing.

```tsx
import { useUISounds } from '@doodle-engine/react'

const uiSounds = useUISounds({
  basePath: 'assets/audio/ui',
  volume: 0.5,
  sounds: {
    click: 'click.ogg',
    menuOpen: 'menu_open.ogg',
    menuClose: 'menu_close.ogg',
  },
})

// Play sounds on UI interactions
<button onClick={() => { uiSounds.playClick(); handleAction() }}>
  Do Something
</button>
```

`GameShell` handles UI sounds. Configure them with the `uiSounds` prop:

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    uiSounds={{ volume: 0.5 }}
/>
```

### UI Sound File Organization

Place UI sound files separately from game audio:

```text
assets/
  audio/
    ui/
      click.ogg
      menu_open.ogg
      menu_close.ogg
    music/
      tavern_ambience.ogg
    sfx/
      door_slam.ogg
    voice/
      bartender_greeting.ogg
```
