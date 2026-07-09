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
        basePath: '/assets/audio/ui',
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
| `basePath`         | `string`  | `'/assets/audio/ui'` | Base path for UI sound files |
| `volume`           | `number`  | `0.5`              | Volume level (0-1)           |
| `sounds`           | `object`  | —                  | Custom sound file names      |
| `sounds.click`     | `string`  | `'click.ogg'`      | Click sound file             |
| `sounds.menuOpen`  | `string`  | `'menu_open.ogg'`  | Menu open sound file         |
| `sounds.menuClose` | `string`  | `'menu_close.ogg'` | Menu close sound file        |

### Returns

```typescript
interface UISoundControls {
    playClick: () => void;
    playHover: () => void;
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
    manifest={manifest}
    uiSounds={{
        basePath: '/assets/audio/ui',
        volume: 0.5,
        sounds: { click: 'click.ogg' },
    }}
/>
```

Pass `uiSounds={false}` to disable UI sounds entirely.

---

## useInputAction

Register a renderer input command handler. Use this for keyboard
commands in custom renderer surfaces, panels, and overlays.

```tsx
import { InputProvider, useInputAction } from '@doodle-engine/react';

function DialogueControls({ choices, onChoice, onContinue }) {
    useInputAction(
        ({ command, choiceIndex }) => {
            if (command === 'confirm' && choices.length === 0) {
                onContinue();
                return true;
            }

            if (
                choiceIndex !== undefined &&
                choiceIndex < choices.length
            ) {
                onChoice(choices[choiceIndex].id);
                return true;
            }

            return false;
        },
        { priority: 0 }
    );

    return null;
}

<InputProvider>
    <DialogueControls
        choices={snapshot.choices}
        onChoice={actions.selectChoice}
        onContinue={actions.continueDialogue}
    />
</InputProvider>;
```

`GameShell` already includes `InputProvider`. `GameRenderer` creates a provider
boundary when used standalone, so its built-in keyboard handling works with or
without `GameShell`.

### Commands

Keyboard input is translated into these commands:

| Command      | Default keyboard input             |
| ------------ | ---------------------------------- |
| `confirm`    | Enter, Space                       |
| `cancel`     | Escape                             |
| `choice1`-`choice9` | Number keys 1-9            |
| `next`       | ArrowDown, ArrowRight              |
| `previous`   | ArrowUp, ArrowLeft                 |

The command type also includes `continue`, `openInventory`, `openJournal`,
`openMap`, and `openMenu` so custom renderers can dispatch higher-level UI
commands when they need them.

### Priority

Higher priority handlers receive commands first. Return `true` to consume the
command and prevent lower-priority surfaces from seeing it.

Recommended priorities:

| Surface                    | Priority |
| -------------------------- | -------- |
| Full-screen video/interlude | `300`    |
| Modal or panel overlay      | `150`    |
| Shell pause/settings        | `50`     |
| Dialogue choices/Continue   | `0`      |

Input events from text fields, textareas, selects, and contenteditable elements
are ignored by the default keyboard adapter so typing into player notes does not
trigger game commands.

## useInputRouter

Access the current router directly. Most custom renderers should prefer
`useInputAction`, but `useInputRouter` is useful when integrating another input
source.

```tsx
import { useInputRouter } from '@doodle-engine/react';

function CustomInputBridge() {
    const router = useInputRouter();

    useEffect(() => {
        if (!router) return;

        // When your custom input layer detects the confirm action:
        router.dispatchCommand({
            command: 'confirm',
            source: 'programmatic',
        });
    }, [router]);

    return null;
}
```
