---
title: Engine API
description: Complete reference for the Engine class and all its methods.
---

The `Engine` class runs the game. It receives a content registry, which is the loaded collection of game definitions, and tracks the changing `GameState`: the current location, flags, variables, inventory, quests, and other progress. Each player action returns a snapshot containing the data the renderer needs for the current game screen.

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

Start a new game. Initializes state from config, sets up character and item locations from the registry, and checks for triggered dialogues and interludes at the starting location.

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

The dialogue ends when no next node exists. Outside dialogue, the method returns the current snapshot unchanged.

```typescript
const snapshot = engine.selectChoice('choice_buy_drink');
```

### continueDialogue

```typescript
continueDialogue(): Snapshot
```

Advance past a text-only dialogue node (a node with text but no choices). If the current node has a next node, advances to it. If there is no next node, the dialogue ends.

The method leaves the snapshot unchanged outside dialogue or when the current node has choices.

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

Travel to a location on the current map. The current map is the map that contains the player's current location. Travel calculates time from marker distance and map scale, advances time, ends any active dialogue, and checks for triggered dialogues and interludes at the destination.

The snapshot remains unchanged when the map is disabled (`mapEnabled: false`), the current location has no map, or the destination is on a different map.

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

### getState

```typescript
getState(): GameState
```

Get a complete copy of current game progress, including flags, variables, inventory, quests, and character state. Editing the returned value does not change the running game.

```typescript
const state = engine.getState();
console.log(state.flags);
```

### getRegistry

```typescript
getRegistry(): ContentRegistry
```

Get a complete copy of the content loaded by the engine. Editing the returned value does not change the content used by the running game.

```typescript
const content = engine.getRegistry();
console.log(content.dialogues);
```

### dismissInterlude

```typescript
dismissInterlude(): Snapshot
```

Clear the current pending interlude after the renderer has shown it.

```typescript
const snapshot = engine.dismissInterlude();
```

## Debug and editor methods

These methods support playtest tools, state inspectors, and other development-only workflows.

### applyDebugEffect

```typescript
applyDebugEffect(effect: Effect): Snapshot
```

Apply one effect to the current play session and return the updated snapshot. The effect uses the same processing as an effect written in game content.

### teleport

```typescript
teleport(locationId: string): Snapshot
```

Jump to any location for testing. Party members move with the player. The jump does not add travel time or run location triggers.

### startDialogueAt

```typescript
startDialogueAt(dialogueId: string, nodeId: string): Snapshot
```

Start a dialogue at a chosen node for testing. The node's effects run normally, and a silent node advances normally. If the dialogue or node is missing, the game remains at its current state.

## Data Flow

Player action methods follow the same pattern:

1. Validate inputs
2. Update internal state
3. Build and return a snapshot
4. Clear transient state for action-produced snapshots

Transient state such as notifications, pending sounds, pending video, and pending interludes appears in the snapshot returned by the action that produced it. `getSnapshot()` is a read-only snapshot and does not consume transient state. Use explicit renderer actions such as `dismissInterlude()` when presentation state needs to be cleared.

## Triggered Dialogues

After `newGame()` and `travelTo()`, the engine checks for dialogues with a `triggerLocation` matching the current location. The first dialogue whose conditions pass begins automatically. One triggered dialogue can begin per location change.

The engine also checks triggered interludes after `newGame()` and `travelTo()`. If an interlude's `triggerLocation` and `triggerConditions` match, the snapshot includes it as `pendingInterlude`.
