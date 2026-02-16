---
title: Custom Renderer
description: How to build a custom UI instead of using the default GameRenderer.
---

The default `GameRenderer` provides a complete UI out of the box, but you can build your own using the `useGame` hook and individual components.

## Using useGame

The `useGame` hook provides the current snapshot and all action methods:

```tsx
import { useGame } from '@doodle-engine/react'

function MyCustomGame() {
  const { snapshot, actions } = useGame()

  return (
    <div>
      <h1>{snapshot.location.name}</h1>
      <p>{snapshot.location.description}</p>

      {snapshot.dialogue && (
        <div>
          <strong>{snapshot.dialogue.speakerName}:</strong>
          <p>{snapshot.dialogue.text}</p>
        </div>
      )}

      {snapshot.choices.map((choice) => (
        <button key={choice.id} onClick={() => actions.selectChoice(choice.id)}>
          {choice.text}
        </button>
      ))}

      {!snapshot.dialogue && snapshot.charactersHere.map((char) => (
        <button key={char.id} onClick={() => actions.talkTo(char.id)}>
          Talk to {char.name}
        </button>
      ))}
    </div>
  )
}
```

Wrap it with `GameProvider`:

```tsx
<GameProvider engine={engine} initialSnapshot={snapshot}>
  <MyCustomGame />
</GameProvider>
```

## Available Actions

```typescript
actions.selectChoice(choiceId: string)   // Pick a dialogue choice
actions.talkTo(characterId: string)      // Start conversation
actions.takeItem(itemId: string)         // Pick up an item
actions.travelTo(locationId: string)     // Travel via map
actions.writeNote(title, text)           // Add a player note
actions.deleteNote(noteId: string)       // Remove a player note
actions.setLocale(locale: string)        // Change language
actions.saveGame()                       // Returns SaveData
actions.loadGame(saveData: SaveData)     // Restore from save
```

## Mixing Individual Components

You can use the pre-built components with your own layout:

```tsx
import {
  DialogueBox,
  ChoiceList,
  LocationView,
  CharacterList,
  MapView,
  Inventory,
  Journal,
  NotificationArea,
  SaveLoadPanel,
} from '@doodle-engine/react'

function MyLayout() {
  const { snapshot, actions } = useGame()

  return (
    <div className="my-layout">
      <LocationView location={snapshot.location} />

      {snapshot.dialogue && <DialogueBox dialogue={snapshot.dialogue} />}

      <ChoiceList
        choices={snapshot.choices}
        onSelectChoice={actions.selectChoice}
      />

      <CharacterList
        characters={snapshot.charactersHere}
        onTalkTo={actions.talkTo}
      />

      <Inventory items={snapshot.inventory} />

      <Journal
        quests={snapshot.quests}
        entries={snapshot.journal}
      />

      {snapshot.map && (
        <MapView map={snapshot.map} onTravelTo={actions.travelTo} />
      )}

      <NotificationArea notifications={snapshot.notifications} />

      <SaveLoadPanel
        onSave={actions.saveGame}
        onLoad={actions.loadGame}
      />
    </div>
  )
}
```

## Snapshot Structure

The snapshot provides everything your renderer needs:

```typescript
snapshot.location        // Current location (name, description, banner)
snapshot.dialogue        // Current dialogue node or null
snapshot.choices          // Available choices (empty if no dialogue or auto-advance)
snapshot.charactersHere   // NPCs at current location
snapshot.party            // Characters in the player's party
snapshot.inventory        // Player's items
snapshot.quests           // Active quests with current stage
snapshot.journal          // Unlocked journal entries
snapshot.variables        // Game variables (gold, reputation, etc.)
snapshot.time             // Current in-game time { day, hour }
snapshot.map              // Map data or null if disabled
snapshot.music            // Current music track
snapshot.ambient          // Current ambient sound
snapshot.notifications    // Transient notifications (shown once)
snapshot.pendingSounds    // Sound effects to play (cleared after snapshot)
```

## Building Without React

The core engine is framework-agnostic. Use it with any UI:

```typescript
import { Engine } from '@doodle-engine/core'

const engine = new Engine(registry, state)
const snapshot = engine.newGame(config)

// Render snapshot however you want
renderMyUI(snapshot)

// On user action
const newSnapshot = engine.selectChoice('choice_1')
renderMyUI(newSnapshot)
```

See [Engine API Reference](/doodle-engine/reference/engine-api/) for all available methods.
