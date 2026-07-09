---
title: Customizing Doodle Engine
description: How to customize Doodle Engine beyond the defaults.
---

Doodle Engine is built around a stable core that can be used with different renderers, shells, save systems, and UI components. Most game behavior can be built with content: locations, dialogue, conditions, effects, flags, variables, items, quests, maps, audio, video, and interludes.

## Building a Custom Renderer

The core package (`@doodle-engine/core`) has no UI dependencies. You can build a renderer with any framework, or no framework at all.

```typescript
import { Engine } from '@doodle-engine/core';
import type { ContentRegistry, GameConfig } from '@doodle-engine/core';

// Create engine with your content
const engine = new Engine(registry);
const snapshot = engine.newGame(config);

// The snapshot contains the current game screen data:
// snapshot.location, snapshot.dialogue, snapshot.choices,
// snapshot.charactersHere, snapshot.inventory, snapshot.quests, etc.

// Call engine methods, get new snapshots:
const newSnapshot = engine.talkTo('bartender');
const newSnapshot2 = engine.selectChoice('choice_id');
const newSnapshot3 = engine.travelTo('market');
```

The engine follows a simple pattern: actions go in, snapshots come out. Your renderer reads the snapshot, displays the UI, and calls engine methods when the player does something.

### With Vue

```javascript
import { ref, watchEffect } from 'vue';
import { Engine } from '@doodle-engine/core';

const snapshot = ref(engine.newGame(config));

function talkTo(characterId) {
    snapshot.value = engine.talkTo(characterId);
}

function selectChoice(choiceId) {
    snapshot.value = engine.selectChoice(choiceId);
}
```

### With Svelte

```javascript
import { writable } from 'svelte/store';
import { Engine } from '@doodle-engine/core';

const snapshot = writable(engine.newGame(config));

function talkTo(characterId) {
    snapshot.set(engine.talkTo(characterId));
}
```

### With Vanilla JS

```javascript
import { Engine } from '@doodle-engine/core';

let snapshot = engine.newGame(config);

function render() {
    document.getElementById('location').textContent = snapshot.location.name;
    document.getElementById('description').textContent =
        snapshot.location.description;
    // ... render dialogue, choices, characters, etc.
}

function talkTo(characterId) {
    snapshot = engine.talkTo(characterId);
    render();
}
```

## Custom React Components

Instead of using `GameRenderer`, you can compose individual components:

```tsx
import {
    GameProvider,
    InputProvider,
    useGame,
    DialogueBox,
    ChoiceList,
    CharacterList,
    LocationView,
    Inventory,
    MapView,
    Journal,
} from '@doodle-engine/react';

function MyCustomUI() {
    const { snapshot, actions } = useGame();

    return (
        <div className="my-layout">
            <LocationView location={snapshot.location} />

            {snapshot.dialogue ? (
                <>
                    <DialogueBox dialogue={snapshot.dialogue} />
                    <ChoiceList
                        choices={snapshot.choices}
                        onSelectChoice={actions.selectChoice}
                        onContinue={actions.continueDialogue}
                        continueLabel={snapshot.ui['ui.continue']}
                    />
                </>
            ) : (
                <CharacterList
                    characters={snapshot.charactersHere}
                    onTalkTo={actions.talkTo}
                />
            )}

            <Inventory items={snapshot.inventory} />
        </div>
    );
}

// Wrap in InputProvider if your custom UI uses keyboard commands.
<InputProvider>
    <GameProvider engine={engine} initialSnapshot={snapshot}>
        <MyCustomUI />
    </GameProvider>
</InputProvider>;
```

See [React Components Reference](/reference/react-components/) for all available components and props.

## Custom Game Shell

Instead of using `GameShell`, build your own title screen and menu flow:

```tsx
import {
    GameProvider,
    GameRenderer,
    InputProvider,
    useGame,
    useAudioManager,
} from '@doodle-engine/react';

function MyGameApp() {
    const [screen, setScreen] = useState('title');
    const [engine, setEngine] = useState(null);

    if (screen === 'title') {
        return (
            <MyTitleScreen
                onStart={() => {
                    // Create engine, set screen to 'playing'
                }}
            />
        );
    }

    return (
        <InputProvider>
            <GameProvider engine={engine} initialSnapshot={snapshot}>
                <MyGameUI />
            </GameProvider>
        </InputProvider>
    );
}
```

See [Game Shell](/guides/game-shell/) for how the built-in `GameShell` works, as a reference for building your own.

## Building Rules With Conditions

Doodle Engine supports the condition types listed in the [Conditions reference](/reference/conditions/). These conditions are evaluated inside the engine for choices, `IF` blocks, triggered dialogues, and triggered interludes.

For game-specific rules, use the existing conditions creatively. Store what matters in flags, variables, inventory, quests, character state, time, or rolls, then check that state later.

```
SET variable playerClass "mage"

CHOICE "Ask about the old tower."
  REQUIRE variableEquals playerClass "mage"
  GOTO mage_tower_lore
END
```

In this example, the game records the player's class in a variable. Later, the choice appears only when that variable is `mage`.

## Combining Built-in Effects

Effects are how content records that something happened. Combine them to make larger game actions, then use conditions to check those results later:

```
# Unlock an ability using flags and variables
SET flag ability_fireball
ADD variable mana_cost_fireball 10
NOTIFY @notification.learned_fireball

# Shop purchase using variables and items
REQUIRE variableGreaterThan gold 49
ADD variable gold -50
ADD item enchanted_sword
NOTIFY @notification.bought_sword
```

Doodle Engine's effects cover flags, variables, items, quests, journal entries, characters, audio, video, interludes, notifications, dice rolls, map state, and dialogue flow. Combine effects with conditions to model game-specific behavior.

## Custom Save/Load Backends

The engine's `saveGame()` returns a `SaveData` object and `loadGame()` accepts one. You can store this anywhere:

```typescript
// Save to your own backend
const saveData = engine.saveGame();
await fetch('/api/saves', {
    method: 'POST',
    body: JSON.stringify(saveData),
});

// Load from your backend
const response = await fetch('/api/saves/latest');
const saveData = await response.json();
const snapshot = engine.loadGame(saveData);
```

```typescript
// Save to IndexedDB
const db = await openDB('my-game', 1);
await db.put('saves', engine.saveGame(), 'slot-1');

// Load from IndexedDB
const saveData = await db.get('saves', 'slot-1');
const snapshot = engine.loadGame(saveData);
```

The `SaveData` object is a plain JSON-serializable object. Store it however you like.
