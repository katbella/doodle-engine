---
title: Save & Load
description: How to save and load game state.
---

Doodle Engine’s built-in game shell lets players continue their latest game, make manual saves, use a quick save, and return to an autosave after traveling. Saves are stored in the player’s browser by default.

## Saving in the Built-in Renderer

The game shell keeps three kinds of save:

- **Quick save**: one slot. The pause menu's Save button writes it and overwrites the previous quick save.
- **Autosave**: one slot, written automatically when the player travels to a new place. It overwrites the previous autosave.
- **Manual saves**: as many as the player wants. The Save/Load panel’s **New Save** button adds one, and manual saves can be deleted from the same panel.

The Save/Load panel lists the quick save and autosave first, followed by manual saves with the newest at the top. **Load** restores the selected save. The title screen’s **Continue** button restores the most recent save of any kind.

All three kinds are stored in the browser’s local storage (`localStorage`) under the key passed to `GameShell`. The default key is `doodle-engine-save`; give each game a different `storageKey` when several games may share the same site.

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    storageKey="harbor-lights-saves"
/>
```

## What a Save Contains

`engine.saveGame()` returns a `SaveData` object containing:

- Current location and time
- Flags and variables
- Inventory and item locations
- Quest progress and unlocked journal entries
- Player notes
- Current dialogue state
- Character locations, party membership, relationships, and stats
- Map availability and the current locale

`SaveData` also includes a save-format version and timestamp. It contains game state rather than the content definitions themselves, so loading uses the content from the current version of the game.

## Saving and Loading in Code

Call `saveGame()` to capture the current state. Pass that object to `loadGame()` to restore it; `loadGame()` returns the new snapshot for the renderer.

```typescript
const saveData = engine.saveGame();
const restoredSnapshot = engine.loadGame(saveData);
```

`SaveData` is an ordinary JavaScript object. Browser storage and web servers usually store or transmit it as JSON, a text representation of that object.

## Using SaveLoadPanel in a Custom Renderer

The built-in `GameRenderer` already includes this panel. A custom React renderer can add it directly:

```tsx
import { SaveLoadPanel } from '@doodle-engine/react';

<SaveLoadPanel
    ui={snapshot.ui}
    onSave={() => engine.saveGame()}
    onLoad={(saveData) => {
        const restoredSnapshot = engine.loadGame(saveData);
        updateSnapshot(restoredSnapshot);
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
| `storageKey` | `string`                       | `'doodle-engine-save'` | Browser storage key               |
| `className`  | `string`                       | `''`                   | CSS class                          |

The `@doodle-engine/react` package also exports `listSaves`, `writeSave`, `loadSave`, `deleteSave`, `latestSave`, and `hasSaves` for a custom save interface that still uses browser storage.

## Storing Saves Elsewhere

Use the engine API directly when saves belong on a server, in a desktop application, or in another storage system. Convert the save to JSON when sending it in an HTTP request:

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
const restoredSnapshot = engine.loadGame(saveData);
```

See the [Engine API](/reference/engine-api/#savegame) for the method signatures and [React Components](/reference/react-components/#saveloadpanel) for every panel prop.
