---
title: Custom Renderer
description: Build a game interface with Doodle Engine's React APIs or another UI framework.
---

The built-in `GameRenderer` assembles Doodle Engine's standard interface. A custom renderer can arrange the React components differently or present engine state through an interface of its own.

Before starting here, make sure CSS is not enough: [Game Shell styling](/guides/game-shell/#styling) retheming covers most visual changes without any code. This page assumes React and TypeScript experience, a working project, and familiarity with the snapshot idea from [Architecture](/technical/architecture/).

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
import { PROJECT_ID } from './project';

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

The examples above use the actions needed for dialogue and keyboard input. The [`useGame` reference](/reference/react-hooks/#usegame) lists every available action and its behavior.

## Mixing Individual Components

You can arrange the built-in components in your own layout:

```tsx
import {
    LoadingScreen,
    DialogueBox,
    ChoiceList,
    LocationView,
    CharacterList,
    PlayerSetup,
    MapView,
    Inventory,
    Journal,
    NotificationArea,
    SaveLoadPanel,
} from '@doodle-engine/react';
import { PROJECT_ID } from './project';

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

            {!snapshot.player.profileComplete && (
                <PlayerSetup
                    onSubmit={actions.setPlayerProfile}
                />
            )}

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
                projectId={PROJECT_ID}
            />
        </div>
    );
}
```

## Work with the Snapshot

The examples above use resolved location, dialogue, character, map, and progress data from the current snapshot. [The snapshot section in Architecture](/technical/architecture/#snapshot-derived) shows the complete structure and explains which fields are derived or transient. Use the `Snapshot` type exported by `@doodle-engine/core` when implementing the renderer.

## Debug a Custom Renderer

The provider example enables `window.doodle` only in development through `devTools={import.meta.env.DEV}`. [Debugging with Dev Tools](/technical/debugging-with-devtools/) explains when the console API becomes available and lists its inspection and state-control commands.

## Building Without React

The core engine has no React dependency and can be used with another UI framework:

```typescript
import { Engine } from '@doodle-engine/core';

const engine = new Engine(registry);
const snapshot = engine.newGame(config);

// Render snapshot however you want
renderMyUI(snapshot);

// A non-React renderer can inspect snapshot.player and snapshot.party,
// then complete a requested profile with engine.setPlayerProfile(profile).

// On user action
const newSnapshot = engine.selectChoice('choice_1');
renderMyUI(newSnapshot);
```

See [Engine API Reference](/reference/engine-api/) for all available methods.
