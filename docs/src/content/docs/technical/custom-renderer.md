---
title: Custom Renderer
description: Build a game interface with Doodle's React APIs or another UI framework.
---

The built-in `GameRenderer` assembles Doodle's standard interface. A custom renderer can arrange the React components differently or present engine state through an interface of its own.

## Using useGame

The `useGame` hook provides the current snapshot, which contains the data for the current game screen, and the methods for player actions:

```tsx
import { useGame } from '@doodle-engine/react';

function MyCustomGame() {
    const { snapshot, actions } = useGame();

    return (
        <div>
            <h1>{snapshot.location.name}</h1>
            <p>{snapshot.location.description}</p>

            {snapshot.dialogue && (
                <div>
                    <strong>{snapshot.dialogue.speakerName}:</strong>
                    <p>{snapshot.dialogue.text}</p>

                    {snapshot.choices.length > 0
                        ? snapshot.choices.map((choice) => (
                              <button
                                  key={choice.id}
                                  onClick={() => actions.selectChoice(choice.id)}
                              >
                                  {choice.text}
                              </button>
                          ))
                        : (
                              <button onClick={actions.continueDialogue}>
                                  Continue
                              </button>
                          )}
                </div>
            )}

            {!snapshot.dialogue &&
                snapshot.charactersHere.map((char) => (
                    <button
                        key={char.id}
                        onClick={() => actions.talkTo(char.id)}
                    >
                        Talk to {char.name}
                    </button>
                ))}
        </div>
    );
}
```

Wrap it with `AssetProvider` and `GameProvider`. The asset manifest is the list of media files needed by the game. Render a placeholder while the content and assets load:

```tsx
import { Engine, type AssetManifest, type Snapshot } from '@doodle-engine/core';
import { AssetProvider, GameProvider } from '@doodle-engine/react';

function App() {
    const [game, setGame] = useState<{
        engine: Engine;
        snapshot: Snapshot;
        manifest: AssetManifest;
    } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/content').then((r) => r.json()),
            fetch('/api/manifest').then((r) => r.json()),
        ]).then(([{ registry, config }, manifest]) => {
            const engine = new Engine(registry);
            const snapshot = engine.newGame(config);
            setGame({ engine, snapshot, manifest });
        });
    }, []);

    if (!game)
        return (
            <div className="app-bootstrap">
                <div className="spinner" />
            </div>
        );

    return (
        <AssetProvider manifest={game.manifest}>
            <GameProvider
                engine={game.engine}
                initialSnapshot={game.snapshot}
                devTools={import.meta.env.DEV}
            >
                <MyCustomGame />
            </GameProvider>
        </AssetProvider>
    );
}
```

If your custom renderer uses keyboard input, wrap it with `InputProvider` and
register command handlers with `useInputAction`. `GameShell` already does this
for you.

```tsx
import {
    GameProvider,
    InputProvider,
    useGame,
    useInputAction,
} from '@doodle-engine/react';

function KeyboardDialogue() {
    const { snapshot, actions } = useGame();

    useInputAction(
        ({ command, choiceIndex }) => {
            if (command === 'confirm' && snapshot.choices.length === 0) {
                actions.continueDialogue();
                return true;
            }

            if (
                choiceIndex !== undefined &&
                choiceIndex < snapshot.choices.length
            ) {
                actions.selectChoice(snapshot.choices[choiceIndex].id);
                return true;
            }

            return false;
        },
        { priority: 0 }
    );

    return null;
}

<InputProvider>
    <GameProvider engine={engine} initialSnapshot={snapshot}>
        <MyCustomGame />
        <KeyboardDialogue />
    </GameProvider>
</InputProvider>;
```

Use higher priorities for overlays. For example, an interlude or video should
register at priority `300`, a modal panel around `150`, shell pause/settings
around `50`, and dialogue controls at `0`. A handler returns `true` when it
consumes the command, preventing lower-priority UI from seeing it.

## Available Actions

```typescript
actions.selectChoice(choiceId: string)   // Pick a dialogue choice
actions.continueDialogue()               // Advance past a text-only node
actions.talkTo(characterId: string)      // Start conversation
actions.travelTo(locationId: string)     // Travel via map
actions.writeNote(title, text)           // Add a player note
actions.deleteNote(noteId: string)       // Remove a player note
actions.setLocale(locale: string)        // Change language
actions.saveGame()                       // Returns SaveData
actions.loadGame(saveData: SaveData)     // Restore from save
actions.dismissInterlude()               // Clear a pending interlude
```

## Mixing Individual Components

You can arrange the built-in components in your own layout:

```tsx
import {
    LoadingScreen,
    DialogueBox,
    ChoiceList,
    LocationView,
    CharacterList,
    MapView,
    Inventory,
    Journal,
    NotificationArea,
    SaveLoadPanel,
} from '@doodle-engine/react';

function MyLayout() {
    const { snapshot, actions } = useGame();

    return (
        <div className="my-layout">
            <LocationView location={snapshot.location} />

            {snapshot.dialogue && <DialogueBox dialogue={snapshot.dialogue} />}

            <ChoiceList
                choices={snapshot.choices}
                onSelectChoice={actions.selectChoice}
                onContinue={actions.continueDialogue}
            />

            <CharacterList
                characters={snapshot.charactersHere}
                onTalkTo={actions.talkTo}
            />

            <Inventory items={snapshot.inventory} />

            <Journal quests={snapshot.quests} entries={snapshot.journal} />

            {snapshot.map && (
                <MapView
                    map={snapshot.map}
                    currentLocation={snapshot.location.id}
                    currentTime={snapshot.time}
                    onTravelTo={actions.travelTo}
                />
            )}

            <NotificationArea notifications={snapshot.notifications} />

            <SaveLoadPanel
                ui={snapshot.ui}
                onSave={actions.saveGame}
                onLoad={actions.loadGame}
            />
        </div>
    );
}
```

## Snapshot Structure

The snapshot provides the current game screen data:

```typescript
snapshot.location; // Current location (name, description, banner)
snapshot.dialogue; // Current dialogue node or null
snapshot.choices; // Available choices (empty if no dialogue or auto-advance)
snapshot.charactersHere; // NPCs at current location
snapshot.party; // Characters in the player's party
snapshot.inventory; // Player's items
snapshot.quests; // Active quests with current stage
snapshot.journal; // Unlocked journal entries
snapshot.variables; // Game variables (gold, reputation, etc.)
snapshot.time; // Current in-game time { day, hour }
snapshot.map; // Map data or null if disabled
snapshot.music; // Current music track
snapshot.ambient; // Current ambient sound
snapshot.notifications; // Transient notifications from the last action
snapshot.pendingSounds; // Sound effects to play from the last action
snapshot.pendingVideo; // Video to play fullscreen from the last action
snapshot.pendingInterlude; // Interlude to show from the last action
snapshot.currentLocale; // Current language code (e.g. "en")
snapshot.ui; // Resolved UI strings (e.g. snapshot.ui['ui.continue'])
```

## Dev Tools Console API

When `devTools={import.meta.env.DEV}` is set on `GameProvider` or `GameShell`, a `window.doodle` object is available in your browser's DevTools console while developing. Type `doodle.inspect()` to see all available commands:

```text
doodle.setFlag("flagName")              // Set a flag
doodle.clearFlag("flagName")            // Clear a flag
doodle.setVariable("gold", 100)         // Set a variable
doodle.getVariable("gold")              // Read a variable
doodle.teleport("locationId")           // Jump to a location
doodle.triggerDialogue("dialogueId")    // Start a dialogue
doodle.setQuestStage("questId", "stage")
doodle.addItem("itemId")
doodle.removeItem("itemId")
doodle.inspect()                        // Print current state summary
doodle.inspectState()                   // Return raw game state object
doodle.inspectRegistry()                // Return content registry object
```

`window.doodle` is only available after a game has started (after clicking New Game or Continue), because `GameProvider` must be mounted first.

## Building Without React

The core engine has no React dependency and can be used with another UI framework:

```typescript
import { Engine } from '@doodle-engine/core';

const engine = new Engine(registry);
const snapshot = engine.newGame(config);

// Render snapshot however you want
renderMyUI(snapshot);

// On user action
const newSnapshot = engine.selectChoice('choice_1');
renderMyUI(newSnapshot);
```

See [Engine API Reference](/reference/engine-api/) for all available methods.
