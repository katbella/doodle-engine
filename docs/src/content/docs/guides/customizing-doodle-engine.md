---
title: Customizing Doodle Engine
description: How to customize Doodle Engine beyond the defaults.
---

Doodle Engine keeps game state separate from presentation. A renderer is the code that turns that state into the interface the player sees. You can restyle the built-in renderer, compose a different interface from Doodle's React components, or build your own renderer. Conditions, effects, and custom save storage provide further ways to shape the game.

## Building a Custom Renderer

The core package (`@doodle-engine/core`) has no UI dependencies. You can build a renderer with any framework, or no framework at all. The engine receives a content registry, the loaded collection of game definitions, when it starts.

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

After each player action, the engine returns a snapshot describing what the renderer should show. Your renderer displays that snapshot and calls engine methods when the player takes another action.

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

Use individual React components to assemble a different interface:

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

Build a custom title screen and menu flow by composing the providers and components directly:

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

```text
SET variable playerClass mage

CHOICE Ask about the old tower.
  REQUIRE variableEquals playerClass mage
  GOTO mage_tower_lore
END
```

In this example, the game records the player's class in a variable. Later, the choice appears only when that variable is `mage`.

## Combining Built-in Effects

Effects are how content records that something happened. Combine them to make larger game actions, then use conditions to check those results later:

```text
# Unlock an ability using flags and variables
SET flag ability_fireball
ADD variable mana_cost_fireball 10
NOTIFY You learned Fireball.

# Shop purchase using variables and items
REQUIRE variableGreaterThan gold 49
ADD variable gold -50
ADD item enchanted_sword
NOTIFY Enchanted sword added to inventory.
```

Combine effects with conditions to model rules and behavior specific to your game.

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

You can also store saves in IndexedDB, the browser's built-in database:

```typescript
// Save to IndexedDB
const db = await openDB('my-game', 1);
await db.put('saves', engine.saveGame(), 'slot-1');

// Load from IndexedDB
const saveData = await db.get('saves', 'slot-1');
const snapshot = engine.loadGame(saveData);
```

`SaveData` is a plain object that can be converted to JSON and stored wherever your application needs it.
