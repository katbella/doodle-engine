---
title: Debugging with Dev Tools
description: Use window.doodle API to debug your game during development.
---

The Doodle Engine provides a framework-agnostic browser console API (`window.doodle`) for debugging and testing your game during development. Dev tools are part of `@doodle-engine/core` and work with any renderer (React, Vue, Svelte, vanilla JS).

Dev tools are automatically stripped from production builds via tree-shaking.

## Enabling Dev Tools

Dev tools are part of `@doodle-engine/core` and work with any framework. Import and enable them in development mode:

### React

The React renderer automatically enables dev tools in development mode:

```tsx
// Already integrated in GameProvider - no extra setup needed!
import { GameProvider } from '@doodle-engine/react';
```

If you're building a custom React renderer:

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

### Vue

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { enableDevTools } from '@doodle-engine/core';

const props = defineProps(['engine']);
const snapshot = ref(props.engine.getSnapshot());

onMounted(() => {
    if (import.meta.env.DEV) {
        enableDevTools(props.engine, () => {
            snapshot.value = props.engine.getSnapshot();
        });
    }
});

onUnmounted(() => {
    if (import.meta.env.DEV) {
        delete window.doodle;
    }
});
</script>
```

### Svelte

```svelte
<script>
  import { onMount, onDestroy } from 'svelte'
  import { enableDevTools } from '@doodle-engine/core'

  export let engine

  $: snapshot = engine.getSnapshot()

  onMount(() => {
    if (import.meta.env.DEV) {
      enableDevTools(engine, () => {
        snapshot = engine.getSnapshot()
      })
    }
  })

  onDestroy(() => {
    if (import.meta.env.DEV) {
      delete window.doodle
    }
  })
</script>
```

### Vanilla JavaScript

```js
import { enableDevTools } from '@doodle-engine/core';

let engine = new Engine(registry, initialState);
let snapshot = engine.getSnapshot();

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
    doodle dev
    ```

2. Open your game in the browser (usually `http://localhost:3000`)

3. Open the browser console (F12 or right-click → Inspect → Console)

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
// → 500
```

**Use case**: Test shop systems, stat checks, or any mechanic that depends on variables.

### Location Control

Instantly teleport to any location without using the map.

```js
doodle.teleport('tavern');
doodle.teleport('market');
doodle.teleport('dungeon_entrance');
```

**Use case**: Quickly navigate to specific locations to test content without traversing the map.

### Dialogue Control

Trigger any dialogue directly, bypassing normal game flow.

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

**Use case**: Debug state issues, verify content loaded correctly, or understand what's happening behind the scenes.

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

Something's not working as expected:

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

## Limitations

- Dev tools access **internal engine state** using private fields. This is intentional for debugging but means breaking changes to the engine internals won't be considered breaking changes to the dev tools API.
- Dev tools only work in **development mode** (`doodle dev`). They are not available in production builds.
- State changes made via dev tools **bypass all game logic**. For example, `doodle.addItem()` doesn't trigger effects or run conditions—it directly mutates the state.

## Production Safety

Dev tools are completely removed from production builds:

1. `import.meta.env.DEV` is replaced with `false` by Vite during production builds
2. The `if (import.meta.env.DEV)` block is eliminated by the minifier
3. The `enableDevTools` function and entire devtools module are tree-shaken from the bundle
4. `window.doodle` is undefined in production

This works the same way across all frameworks (React, Vue, Svelte, vanilla JS). Your players will never see or access the dev tools.

## Tips

- Use `doodle.inspect()` as your starting point. It shows the current game state and lists all available commands.
- Combine commands to set up complex scenarios: set multiple flags, add items, then trigger dialogue.
- Save console commands in a text file or browser snippet for scenarios you test repeatedly.
- Use `inspectState()` and `inspectRegistry()` to understand how the engine represents your content internally.
