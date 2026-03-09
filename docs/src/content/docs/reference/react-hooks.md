---
title: React Hooks
description: Reference for useGame and useAudioManager hooks.
---

## useGame

Access the game context (snapshot and actions) from any component inside a `GameProvider`.

```tsx
import { useGame } from '@doodle-engine/react';

function MyComponent() {
    const { snapshot, actions } = useGame();

    return (
        <div>
            <h1>{snapshot.location.name}</h1>
            <button onClick={() => actions.talkTo('bartender')}>
                Talk to {snapshot.charactersHere[0]?.name}
            </button>
        </div>
    );
}
```

### Returns

```typescript
interface GameContextValue {
    snapshot: Snapshot;
    actions: {
        selectChoice: (choiceId: string) => void;
        continueDialogue: () => void;
        talkTo: (characterId: string) => void;
        travelTo: (locationId: string) => void;
        writeNote: (title: string, text: string) => void;
        deleteNote: (noteId: string) => void;
        setLocale: (locale: string) => void;
        saveGame: () => SaveData;
        loadGame: (saveData: SaveData) => void;
        dismissInterlude: () => void;
    };
}
```

### Requirements

Must be used inside a `GameProvider`. Throws an error if used outside.

### Actions

Each action calls the corresponding engine method and updates the snapshot:

| Action                   | Description                                  |
| ------------------------ | -------------------------------------------- |
| `selectChoice(choiceId)` | Pick a dialogue choice                       |
| `continueDialogue()`     | Advance past a text-only dialogue node       |
| `talkTo(characterId)`    | Start conversation with a character          |
| `travelTo(locationId)`   | Travel to a map location                     |
| `writeNote(title, text)` | Add a player note                            |
| `deleteNote(noteId)`     | Remove a player note                         |
| `setLocale(locale)`      | Change language                              |
| `saveGame()`             | Returns `SaveData` (doesn't update snapshot) |
| `loadGame(saveData)`     | Restores state and updates snapshot          |
| `dismissInterlude()`     | Clears a pending interlude from the snapshot |

---

## useAudioManager

Manages audio playback automatically based on snapshot changes.

Manages audio playback automatically based on snapshot changes. Volumes are reactive parameters: pass current values each render and the hook applies them to the audio elements.

The caller owns volume state (typically via `AudioSettingsContext`). This hook does not store volumes internally.

```tsx
import { useAudioManager, useAudioSettings, AudioSettingsProvider } from '@doodle-engine/react';

function MyGame() {
    const { snapshot } = useGame();
    const audioSettings = useAudioSettings();

    const { stopAll } = useAudioManager(snapshot, {
        masterVolume: audioSettings.masterVolume,
        musicVolume: audioSettings.musicVolume,
        soundVolume: audioSettings.soundVolume,
        voiceVolume: audioSettings.voiceVolume,
    });

    return <button onClick={stopAll}>Stop Audio</button>;
}

// Wrap in AudioSettingsProvider for persistent volume state
<AudioSettingsProvider>
    <GameProvider engine={engine} initialSnapshot={snapshot}>
        <MyGame />
    </GameProvider>
</AudioSettingsProvider>
```

### Parameters

| Parameter  | Type                  | Description                            |
| ---------- | --------------------- | -------------------------------------- |
| `snapshot` | `Snapshot`            | Current game snapshot                  |
| `options`  | `AudioManagerOptions` | Volume levels and crossfade config     |

### Options

Volume values are **reactive**: when they change, all active audio elements update immediately.

| Option              | Type     | Default | Description                    |
| ------------------- | -------- | ------- | ------------------------------ |
| `masterVolume`      | `number` | `1.0`   | Master volume multiplier (0-1) |
| `musicVolume`       | `number` | `0.7`   | Music channel volume (0-1)     |
| `soundVolume`       | `number` | `0.8`   | Sound effects volume (0-1)     |
| `voiceVolume`       | `number` | `1.0`   | Voice channel volume (0-1)     |
| `crossfadeDuration` | `number` | `1000`  | Music crossfade duration in ms |

### Returns

```typescript
interface AudioManagerControls {
    stopAll: () => void;
}
```

### Audio Channels

The hook manages four channels:

| Channel     | Source                     | Behavior                                |
| ----------- | -------------------------- | --------------------------------------- |
| **Music**   | `snapshot.music`           | Loops, crossfades between tracks        |
| **Ambient** | `snapshot.ambient`         | Loops, swaps on location change         |
| **Voice**   | `snapshot.dialogue?.voice` | Plays dialogue voice lines              |
| **Sound**   | `snapshot.pendingSounds`   | One-shot effects, cleared after playing |

### Automatic Behavior

- When `snapshot.music` changes, the current track crossfades to the new one
- When `snapshot.ambient` changes, the ambient track swaps immediately
- When `snapshot.dialogue?.voice` is present, the voice file plays
- All entries in `snapshot.pendingSounds` are played as one-shot effects
- Volume levels are applied as `channelVolume × masterVolume`
- Audio paths are resolved by the engine before reaching this hook. Write bare filenames in YAML content.

---

## useUISounds

Standalone hook for UI chrome sounds (clicks, menu open/close). This is separate from `useAudioManager` because it handles renderer UI sounds, not game content audio.

```tsx
import { useUISounds } from '@doodle-engine/react';

function MyUI() {
    const uiSounds = useUISounds({
        basePath: '/audio/ui',
        volume: 0.5,
        sounds: {
            click: 'click.ogg',
            menuOpen: 'menu_open.ogg',
            menuClose: 'menu_close.ogg',
        },
    });

    return (
        <button
            onClick={() => {
                uiSounds.playClick();
                doSomething();
            }}
        >
            Click Me
        </button>
    );
}
```

### Options

| Option             | Type      | Default            | Description                  |
| ------------------ | --------- | ------------------ | ---------------------------- |
| `enabled`          | `boolean` | `true`             | Enable/disable UI sounds     |
| `basePath`         | `string`  | `'/audio/ui'`      | Base path for UI sound files |
| `volume`           | `number`  | `0.5`              | Volume level (0-1)           |
| `sounds`           | `object`  | —                  | Custom sound file names      |
| `sounds.click`     | `string`  | `'click.ogg'`      | Click sound file             |
| `sounds.menuOpen`  | `string`  | `'menu_open.ogg'`  | Menu open sound file         |
| `sounds.menuClose` | `string`  | `'menu_close.ogg'` | Menu close sound file        |

### Returns

```typescript
interface UISoundControls {
    playClick: () => void;
    playMenuOpen: () => void;
    playMenuClose: () => void;
    playSound: (key: string) => void;
    setEnabled: (enabled: boolean) => void;
    setVolume: (volume: number) => void;
    enabled: boolean;
    volume: number;
}
```

### Usage with GameShell

`GameShell` uses `useUISounds` internally. Configure via the `uiSounds` prop:

```tsx
<GameShell
    registry={registry}
    config={config}
    uiSounds={{
        basePath: '/audio/ui',
        volume: 0.5,
        sounds: { click: 'click.ogg' },
    }}
/>
```

Pass `uiSounds={false}` to disable UI sounds entirely.
