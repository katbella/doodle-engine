---
title: Extending the Engine
description: How to customize and extend Doodle Engine beyond the defaults.
---

Doodle Engine is designed to be extended. The core is framework-agnostic, the React renderer is modular, and every layer can be swapped or customized.

## Building a Custom Renderer

The core package (`@doodle-engine/core`) has no UI dependencies. You can build a renderer with any framework, or no framework at all.

```typescript
import { Engine } from '@doodle-engine/core';
import type {
    GameState,
    ContentRegistry,
    GameConfig,
} from '@doodle-engine/core';

// Create engine with your content
const engine = new Engine(registry, initialState);
const snapshot = engine.newGame(config);

// The snapshot contains everything the renderer needs:
// snapshot.location, snapshot.dialogue, snapshot.choices,
// snapshot.charactersHere, snapshot.inventory, snapshot.quests, etc.

// Call engine methods, get new snapshots:
const newSnapshot = engine.talkTo('bartender');
const newSnapshot2 = engine.selectChoice('choice_id');
const newSnapshot3 = engine.travelTo('market');
```

The engine follows a simple pattern: actions go in, snapshots come out. Your renderer reads the snapshot and displays the UI.

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

// Wrap in GameProvider
<GameProvider engine={engine} initialSnapshot={snapshot}>
    <MyCustomUI />
</GameProvider>;
```

See [React Components Reference](/reference/react-components/) for all available components and props.

## Custom Game Shell

Instead of using `GameShell`, build your own title screen and menu flow:

```tsx
import {
    GameProvider,
    GameRenderer,
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
        <GameProvider engine={engine} initialSnapshot={snapshot}>
            <MyGameUI />
        </GameProvider>
    );
}
```

See [Game Shell](/guides/game-shell/) for how the built-in `GameShell` works, as a reference for building your own.

## Adding Custom Conditions

The condition evaluator can be extended by wrapping the engine's condition checking. Create a custom engine wrapper that handles your conditions before falling back to the built-in ones:

```typescript
import { Engine } from '@doodle-engine/core';

// The engine evaluates conditions defined in the DSL.
// The built-in conditions cover: hasFlag, notFlag, hasItem,
// variableEquals, variableGreaterThan, variableLessThan,
// questAtStage, characterInParty, characterRelationship, etc.

// For custom game logic beyond what conditions support,
// use variables and flags creatively:
// SET variable playerClass "mage"
// REQUIRE variableEquals playerClass "mage"
```

## Adding Custom Effects

Similarly, effects can be combined creatively using the built-in types:

```
# Custom "unlock ability" pattern using flags
SET flag ability_fireball
ADD variable mana_cost_fireball 10
NOTIFY @notification.learned_fireball

# Custom "shop purchase" pattern using variables and items
REQUIRE variableGreaterThan gold 49
ADD variable gold -50
ADD item enchanted_sword
NOTIFY @notification.bought_sword
```

The 25 built-in effect types (flags, variables, items, quests, journal, characters, audio, video, notifications, etc.) can express most game mechanics through composition.

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
