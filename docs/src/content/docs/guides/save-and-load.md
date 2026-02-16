---
title: Save & Load
description: How to save and load game state.
---

Doodle Engine supports saving and loading the complete game state.

## Save Data Format

```typescript
interface SaveData {
  version: string    // Save format version
  timestamp: string  // ISO 8601 timestamp
  state: GameState   // Complete game state
}
```

The `SaveData` contains the entire `GameState`, including current location, time, flags, variables, inventory, quest progress, dialogue state, and more.

## Engine API

### Saving

```typescript
const saveData = engine.saveGame()
// saveData is a plain object, ready to serialize
```

### Loading

```typescript
const snapshot = engine.loadGame(saveData)
// Restores state and returns a fresh snapshot
```

## Using the Default SaveLoadPanel

The `GameRenderer` includes a `SaveLoadPanel` component that saves to `localStorage`:

```tsx
import { GameProvider, GameRenderer } from '@doodle-engine/react'

<GameProvider engine={engine} initialSnapshot={snapshot}>
  <GameRenderer />
</GameProvider>
```

The panel provides Save and Load buttons with feedback messages. The Load button is disabled when no save exists.

## Using SaveLoadPanel Standalone

```tsx
import { SaveLoadPanel } from '@doodle-engine/react'

<SaveLoadPanel
  onSave={() => engine.saveGame()}
  onLoad={(saveData) => {
    const snapshot = engine.loadGame(saveData)
    // update your state with the new snapshot
  }}
  storageKey="my-game-save"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSave` | `() => SaveData` | required | Called when the player clicks Save |
| `onLoad` | `(saveData: SaveData) => void` | required | Called when the player clicks Load |
| `storageKey` | `string` | `'doodle-engine-save'` | localStorage key |
| `className` | `string` | `''` | CSS class |

## Custom Save/Load

For custom storage (server-side, IndexedDB, etc.), use the engine API directly:

```typescript
// Save to server
const saveData = engine.saveGame()
await fetch('/api/save', {
  method: 'POST',
  body: JSON.stringify(saveData),
})

// Load from server
const response = await fetch('/api/save')
const saveData = await response.json()
const snapshot = engine.loadGame(saveData)
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
