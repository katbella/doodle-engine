---
title: Audio
description: How to add music, ambient sounds, voice lines, and sound effects.
---

Doodle Engine supports four audio channels: background music, ambient sounds, voice lines, and one-shot sound effects.

## Setting Up Audio

### Location Music and Ambient

Each location has `music` and `ambient` fields:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
description: '@location.tavern.description'
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

Music automatically crossfades when the player travels to a new location.

### Voice Lines

Add voice to dialogue nodes:

```
NODE emotional_scene
  VOICE bartender_sad.ogg
  BARTENDER: @bartender.sad_line
```

### Sound Effects

Play one-shot sounds from dialogue effects:

```
SOUND door_slam.ogg
```

### Music Override

Change music from dialogue:

```
MUSIC tension_theme.ogg
```

## useAudioManager Hook

The `useAudioManager` hook manages all audio playback automatically based on the snapshot:

```tsx
import { useAudioManager } from '@doodle-engine/react';

function MyGame() {
    const { snapshot } = useGame();

    const audioControls = useAudioManager(snapshot, {
        audioBasePath: '/audio',
        masterVolume: 1.0,
        musicVolume: 0.7,
        soundVolume: 0.8,
        voiceVolume: 1.0,
        crossfadeDuration: 1000,
    });

    // audioControls provides volume setters and stopAll
}
```

### Options

| Option              | Type     | Default    | Description                |
| ------------------- | -------- | ---------- | -------------------------- |
| `audioBasePath`     | `string` | `'/audio'` | Base path for audio files  |
| `masterVolume`      | `number` | `1.0`      | Master volume (0-1)        |
| `musicVolume`       | `number` | `0.7`      | Music channel volume (0-1) |
| `soundVolume`       | `number` | `0.8`      | Sound effects volume (0-1) |
| `voiceVolume`       | `number` | `1.0`      | Voice channel volume (0-1) |
| `crossfadeDuration` | `number` | `1000`     | Crossfade time in ms       |

### Controls

```typescript
interface AudioManagerControls {
    setMasterVolume: (volume: number) => void;
    setMusicVolume: (volume: number) => void;
    setSoundVolume: (volume: number) => void;
    setVoiceVolume: (volume: number) => void;
    stopAll: () => void;
}
```

## How It Works

The hook reacts to snapshot changes:

- **Music**: When `snapshot.music` changes, crossfades to the new track
- **Voice**: When `snapshot.dialogue?.voice` changes, plays the voice file
- **Sounds**: Plays all entries in `snapshot.pendingSounds` (cleared after each snapshot)

Sound effects and pending sounds are transient. They appear in one snapshot and are automatically cleared.

## File Organization

Place audio files in `assets/audio/`:

```
assets/
  audio/
    tavern_ambience.ogg
    market_bustle.ogg
    tension_theme.ogg
    door_slam.ogg
    bartender_greeting.ogg
```

The `audioBasePath` option controls where the hook looks for files. With the default `'/audio'`, files should be served from `/audio/filename.ogg`.

## UI Sounds

UI sounds (button clicks, menu open/close) are handled by a separate `useUISounds` hook. These are renderer chrome sounds, not game content audio.

```tsx
import { useUISounds } from '@doodle-engine/react'

const uiSounds = useUISounds({
  basePath: '/audio/ui',
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

If you're using `GameShell`, UI sounds are built in. Configure them via the `uiSounds` prop:

```tsx
<GameShell registry={registry} config={config} uiSounds={{ volume: 0.5 }} />
```

### UI Sound File Organization

Place UI sound files separately from game audio:

```
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
