---
title: Debugging with Dev Tools
description: Use window.doodle API to debug your game during development.
---

The browser console API, `window.doodle`, lets you inspect and change game state while testing. It works with any renderer when dev tools are enabled.

New React projects use `devTools={import.meta.env.DEV}` to enable these commands during development and omit them from release builds, so in a fresh project you can skip straight to [Using Dev Tools](#using-dev-tools). Studio users testing dialogue state usually want [Playtest](/studio/playtesting/) instead, which offers the same state control without the console. Dev tools are for testing in the real browser through Preview or `npm run dev`.

:::note
`window.doodle` appears only after a game has started, once you click New Game or Continue. On the title screen the object does not exist yet.
:::

## Enabling Dev Tools

Enable dev tools in development mode:

### React

`GameProvider` and `GameShell` enable dev tools when their `devTools` prop is true. New projects pass `import.meta.env.DEV`:

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
    devTools={import.meta.env.DEV}
/>
```

If you are building a React renderer without `GameProvider`, call `enableDevTools` yourself:

```tsx
import { useEffect } from 'react';
import { Engine, enableDevTools } from '@doodle-engine/core';

function MyRenderer({ engine }) {
    const [snapshot, setSnapshot] = useState(engine.getSnapshot());

    useEffect(() => {
        if (import.meta.env.DEV) {
            enableDevTools(engine, () => setSnapshot(engine.getSnapshot()));

            return () => {
                delete window.doodle;
            };
        }
    }, [engine]);

    // ... rest of renderer
}
```

### Vanilla JavaScript

```js
import { enableDevTools } from '@doodle-engine/core';

let engine = new Engine(registry);
let snapshot = engine.newGame(config);

if (import.meta.env.DEV) {
    enableDevTools(engine, () => {
        snapshot = engine.getSnapshot();
        render(snapshot); // Your render function
    });
}
```

## Using Dev Tools

1. Start your dev server:

    ```bash
    npm run dev
    ```

2. Open your game in the browser (usually `http://localhost:3000`)

3. Open the browser console with F12, or right-click the page, select **Inspect**, and open **Console**

4. Type `doodle.inspect()` to see all available commands

## Available Commands

### Flag Manipulation

Flags are boolean game state values used in conditions and branching. Setting them from the console tests flag-dependent dialogue without playing through the events that would normally set them.

```js
// Set a flag
doodle.setFlag('quest_started');
doodle.setFlag('met_merchant');

// Clear a flag
doodle.clearFlag('quest_started');
```

### Variable Manipulation

Variables store numeric or string values such as gold and counters. Change them to test shop systems, stat checks, or any mechanic that depends on a value.

```js
// Set a variable
doodle.setVariable('gold', 500);
doodle.setVariable('player_name', 'Alice');

// Get a variable's current value
doodle.getVariable('gold');
// 500
```

### Location Control

Move the player directly to any location instead of traversing the map.

```js
doodle.teleport('tavern');
doodle.teleport('market');
doodle.teleport('dungeon_entrance');
```

### Dialogue Control

Start any dialogue directly, skipping the prerequisites that would normally lead to it.

```js
doodle.triggerDialogue('bartender_greeting');
doodle.triggerDialogue('merchant_intro');
```

### Quest Control

Set quest stages directly to test quest UI, journal entries, and quest-dependent content at any point in the progression.

```js
doodle.setQuestStage('odd_jobs', 'in_progress');
doodle.setQuestStage('odd_jobs', 'completed');
doodle.setQuestStage('main_quest', 'chapter_2');
```

### Inventory Control

Add or remove items without picking them up in the story, for testing inventory UI and item-dependent dialogue.

```js
// Add an item
doodle.addItem('old_coin');
doodle.addItem('rusty_sword');

// Remove an item
doodle.removeItem('old_coin');
```

### Inspection

View the current game state and content registry when behavior differs from what you expected, or to verify that content loaded.

```js
// Show current state summary and command list
doodle.inspect();

// View current progress and game state
const state = doodle.inspectState();
console.log(state.flags);
console.log(state.inventory);

// View all loaded game content
const registry = doodle.inspectRegistry();
console.log(registry.dialogues);
console.log(registry.characters);
```

Both commands return copies, so exploring their results does not change the running game.

## Example Debugging Workflows

### Testing a Quest Dialogue Branch

You want to test a dialogue option that only appears if the player has completed a quest:

```js
// Set up the prerequisite quest state
doodle.setQuestStage('odd_jobs', 'completed');

// Trigger the dialogue
doodle.triggerDialogue('bartender_greeting');

// The quest-dependent choice should now appear
```

### Testing Shop Purchase Logic

You're building a shop system with conditions based on gold:

```js
// Give yourself gold
doodle.setVariable('gold', 1000);

// Verify the variable is set
doodle.getVariable('gold');

// Trigger the shop dialogue
doodle.triggerDialogue('merchant_shop');

// Try buying items and check if gold decreases correctly
```

### Testing Item-Dependent Dialogue

A character has different dialogue if you're carrying a specific item:

```js
// Add the item
doodle.addItem('magic_amulet');

// Teleport to the character's location
doodle.teleport('wizards_tower');

// Talk to the character
doodle.triggerDialogue('wizard_greeting');

// Special dialogue should appear
```

### Debugging State Issues

Inspect the current state when game behavior differs from what you expected:

```js
// Check current state
const state = doodle.inspectState();

// Look for unexpected flag values
console.log(state.flags);

// Check variable values
console.log(state.variables);

// Verify inventory contents
console.log(state.inventory);
```

## Important behavior

- The dev tools API is designed for debugging and can change when engine internals change.
- Enable it in **development mode** (`npm run dev`) with `import.meta.env.DEV` or another environment guard.
- Commands that change flags, variables, quests, or inventory use the engine's effect system. `teleport()` and `triggerDialogue()` are testing shortcuts: they let you reach a location or dialogue without playing through its normal prerequisites.

## Release builds

Vite replaces `import.meta.env.DEV` with `false` when it creates a release build. Code protected by that check does not run, and `window.doodle` is not created.

New React projects include this check. Use the same pattern in custom renderers.

## Tips

Start every session with `doodle.inspect()`. It prints the current state and the full command list, so you never have to remember the API. Commands combine well: set a few flags, add an item, then trigger the dialogue you want to test, all in sequence. For scenarios you test repeatedly, keep the command sequence in a text file or a browser snippet and paste it in.
