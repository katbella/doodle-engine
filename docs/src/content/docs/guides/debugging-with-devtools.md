---
title: Debugging with Dev Tools
description: Use window.doodle API to debug your game during development.
---

The browser console API, `window.doodle`, lets you inspect and change game state while testing. It works with any renderer when dev tools are enabled.

New React projects use `devTools={import.meta.env.DEV}` to enable these commands during development and omit them from release builds.

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
/>;
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

Flags are boolean game state values used in conditions and branching.

```js
// Set a flag
doodle.setFlag('quest_started');
doodle.setFlag('met_merchant');

// Clear a flag
doodle.clearFlag('quest_started');
```

**Use case**: Test dialogue branches that depend on flags without playing through the entire game.

### Variable Manipulation

Variables store numeric or string values (gold, counters, player name, etc.).

```js
// Set a variable
doodle.setVariable('gold', 500);
doodle.setVariable('player_name', 'Alice');

// Get a variable's current value
doodle.getVariable('gold');
// 500
```

**Use case**: Test shop systems, stat checks, or any mechanic that depends on variables.

### Location Control

Move the player directly to any location.

```js
doodle.teleport('tavern');
doodle.teleport('market');
doodle.teleport('dungeon_entrance');
```

**Use case**: Quickly navigate to specific locations to test content without traversing the map.

### Dialogue Control

Start any dialogue directly.

```js
doodle.triggerDialogue('bartender_greeting');
doodle.triggerDialogue('merchant_intro');
```

**Use case**: Test specific dialogue trees without playing through prerequisites.

### Quest Control

Set quest stages directly to test quest progression.

```js
doodle.setQuestStage('odd_jobs', 'in_progress');
doodle.setQuestStage('odd_jobs', 'completed');
doodle.setQuestStage('main_quest', 'chapter_2');
```

**Use case**: Test quest UI, journal entries, and quest-dependent content.

### Inventory Control

Add or remove items from inventory without picking them up.

```js
// Add an item
doodle.addItem('old_coin');
doodle.addItem('rusty_sword');

// Remove an item
doodle.removeItem('old_coin');
```

**Use case**: Test inventory UI, item-dependent dialogue, or mechanics that require specific items.

### Inspection

View the current game state and content registry.

```js
// Show current state summary and command list
doodle.inspect();

// Return full game state object (flags, variables, inventory, etc.)
const state = doodle.inspectState();
console.log(state.flags);
console.log(state.inventory);

// Return content registry (all loaded entities)
const registry = doodle.inspectRegistry();
console.log(registry.dialogues);
console.log(registry.characters);
```

**Use case**: Debug state issues, verify that content loaded, or inspect the engine's current data.

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
- Dev tools commands change state directly. For example, `doodle.addItem()` adds an item without running effects or evaluating conditions.

## Release builds

Vite replaces `import.meta.env.DEV` with `false` when it creates a release build. Code protected by that check does not run, and `window.doodle` is not created.

New React projects include this check. Use the same pattern in custom renderers.

## Tips

- Use `doodle.inspect()` as your starting point. It shows the current game state and lists all available commands.
- Combine commands to set up complex scenarios: set multiple flags, add items, then trigger dialogue.
- Save console commands in a text file or browser snippet for scenarios you test repeatedly.
- Use `inspectState()` and `inspectRegistry()` to understand how the engine represents your content internally.
