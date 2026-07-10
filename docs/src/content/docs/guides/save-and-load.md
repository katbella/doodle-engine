---
title: Save & Load
description: How to save and load game state.
---

Doodle Engine supports saving and loading the complete game state.

## Save Data Format

```typescript
interface SaveData {
    version: string; // Save format version
    timestamp: string; // ISO 8601 timestamp
    state: GameState; // Complete game state
}
```

The `SaveData` contains the entire `GameState`, including current location, time, flags, variables, inventory, quest progress, dialogue state, and more.

## Engine API

### Saving

```typescript
const saveData = engine.saveGame();
// saveData is a plain object, ready to serialize
```

### Loading

```typescript
const snapshot = engine.loadGame(saveData);
// Restores state and returns a fresh snapshot
```

## Using the Default SaveLoadPanel

The `GameRenderer` includes a `SaveLoadPanel` component that saves to `localStorage`:

```tsx
import { GameProvider, GameRenderer } from '@doodle-engine/react';

<GameProvider engine={engine} initialSnapshot={snapshot}>
    <GameRenderer />
</GameProvider>;
```

The game shell keeps three kinds of save:

- **Quick save**: one slot. The pause menu's Save button writes it and overwrites the previous quick save.
- **Autosave**: one slot, written automatically when the player travels to a new place. It overwrites the previous autosave.
- **Manual saves**: as many as the player wants. The panel's New Save button adds one, and you can delete the ones you no longer need.

The panel lists the quick save and autosave first, then manual saves newest first, and Load opens any of them. The title screen's Continue button opens the most recent save of any kind.

The `@doodle-engine/react` package also exports the save helpers behind this (`listSaves`, `writeSave`, `loadSave`, `deleteSave`, `latestSave`, `hasSaves`) if you want to build your own save UI over `localStorage`.

## Using SaveLoadPanel Standalone

```tsx
import { SaveLoadPanel } from '@doodle-engine/react';

<SaveLoadPanel
    ui={snapshot.ui}
    onSave={() => engine.saveGame()}
    onLoad={(saveData) => {
        const snapshot = engine.loadGame(saveData);
        // update your state with the new snapshot
    }}
    storageKey="my-game-save"
/>;
```

### Props

| Prop         | Type                           | Default                | Description                        |
| ------------ | ------------------------------ | ---------------------- | ---------------------------------- |
| `ui`         | `Record<string, string>`       | required               | Resolved UI strings from snapshot  |
| `onSave`     | `() => SaveData`               | required               | Called when the player clicks Save |
| `onLoad`     | `(saveData: SaveData) => void` | required               | Called when the player clicks Load |
| `storageKey` | `string`                       | `'doodle-engine-save'` | localStorage key                   |
| `className`  | `string`                       | `''`                   | CSS class                          |

## Custom Save/Load

For custom storage (server-side, IndexedDB, etc.), use the engine API directly:

```typescript
// Save to server
const saveData = engine.saveGame();
await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify(saveData),
});

// Load from server
const response = await fetch('/api/save');
const saveData = await response.json();
const snapshot = engine.loadGame(saveData);
```

## What Gets Saved

The complete `GameState` is saved, including:

- Current location and time
- All flags and variables
- Inventory
- Quest progress
- Unlocked journal entries
- Player notes
- Current dialogue state
- Character locations, party membership, relationships, stats
- Item locations
- Map enabled/disabled state
- Current locale
