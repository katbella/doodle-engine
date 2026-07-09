---
title: Engine API
description: Complete reference for the Engine class and all its methods.
---

The `Engine` class is the heart of Doodle Engine. It holds the content registry (static) and game state (dynamic), processes player actions, and produces snapshots.

## Constructor

```typescript
new Engine(registry: ContentRegistry, state?: GameState)
```

| Parameter  | Type              | Description                                               |
| ---------- | ----------------- | --------------------------------------------------------- |
| `registry` | `ContentRegistry` | All game content (locations, characters, dialogues, etc.) |
| `state`    | `GameState`       | Existing game state, usually from a save                  |

Omit `state` when starting a new game with `newGame()`.

## Methods

### newGame

```typescript
newGame(config: GameConfig): Snapshot
```

Start a new game. Initializes state from config, sets up character and item locations from the registry, and checks for triggered dialogues at the starting location.

```typescript
const engine = new Engine(registry);
const snapshot = engine.newGame(config);
```

### loadGame

```typescript
loadGame(saveData: SaveData): Snapshot
```

Restore game state from save data and return a snapshot.

```typescript
const snapshot = engine.loadGame(saveData);
```

### saveGame

```typescript
saveGame(): SaveData
```

Capture the current game state as serializable save data.

```typescript
const saveData = engine.saveGame();
localStorage.setItem('save', JSON.stringify(saveData));
```

Returns:

```typescript
interface SaveData {
    version: string; // "1.0"
    timestamp: string; // ISO 8601
    state: GameState; // Complete state
}
```

### selectChoice

```typescript
selectChoice(choiceId: string): Snapshot
```

Process a player's dialogue choice. Applies the choice's effects, advances to the next dialogue node, and applies that node's effects.

If no next node exists, the dialogue ends. If not currently in dialogue, returns the current snapshot unchanged.

```typescript
const snapshot = engine.selectChoice('choice_buy_drink');
```

### continueDialogue

```typescript
continueDialogue(): Snapshot
```

Advance past a text-only dialogue node (a node with text but no choices). If the current node has a next node, advances to it. If there is no next node, the dialogue ends.

Does nothing if not currently in dialogue or if the current node has choices.

```typescript
const snapshot = engine.continueDialogue();
```

### talkTo

```typescript
talkTo(characterId: string): Snapshot
```

Start a conversation with a character. Looks up the character's `dialogue` field, finds the start node, and begins the dialogue.

```typescript
const snapshot = engine.talkTo('bartender');
```

### travelTo

```typescript
travelTo(locationId: string): Snapshot
```

Travel to a location on the current map. The current map is the map that contains the player's current location. Travel calculates time from marker distance and map scale, advances time, ends any active dialogue, and checks for triggered dialogues at the destination.

Does nothing if the map is disabled (`mapEnabled: false`), if the current location is not on a map, or if the destination is not on the current map.

```typescript
const snapshot = engine.travelTo('market');
```

### writeNote

```typescript
writeNote(title: string, text: string): Snapshot
```

Add a player note to the journal. Notes have auto-generated IDs based on timestamp.

```typescript
const snapshot = engine.writeNote('Clue', 'The bartender mentioned a coin...');
```

### deleteNote

```typescript
deleteNote(noteId: string): Snapshot
```

Remove a player note from the journal.

```typescript
const snapshot = engine.deleteNote('note_1234567890');
```

### setLocale

```typescript
setLocale(locale: string): Snapshot
```

Change the active language. The next snapshot will have all `@key` references resolved against the new locale.

```typescript
const snapshot = engine.setLocale('es');
```

### getSnapshot

```typescript
getSnapshot(): Snapshot
```

Get the current snapshot without making any changes. Useful for initial rendering.

```typescript
const snapshot = engine.getSnapshot();
```

### dismissInterlude

```typescript
dismissInterlude(): Snapshot
```

Clear the current pending interlude after the renderer has shown it.

```typescript
const snapshot = engine.dismissInterlude();
```

## Data Flow

All methods follow the same pattern:

1. Validate inputs
2. Mutate internal state
3. Build and return a snapshot
4. Clear transient state for action-produced snapshots

Transient state such as notifications, pending sounds, pending video, and pending interludes appears in the snapshot returned by the action that produced it. `getSnapshot()` is a read-only snapshot and does not consume transient state. Use explicit renderer actions such as `dismissInterlude()` when presentation state needs to be cleared.

## Triggered Dialogues

After `newGame()` and `travelTo()`, the engine checks for dialogues with a `triggerLocation` matching the current location. If a dialogue's conditions pass, it auto-starts. Only one triggered dialogue fires per location change.
