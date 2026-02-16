---
title: Architecture
description: Understanding the state → action → snapshot data flow.
---

Doodle Engine follows a one-way data flow pattern: **actions go in, snapshots come out**.

## Overview

```
Player Action → Engine → State Mutation → Snapshot → Renderer
     ↑                                                    |
     └────────────────────────────────────────────────────┘
```

1. The **player** performs an action (talk to character, select choice, travel)
2. The **engine** processes the action, evaluating conditions and applying effects
3. **State** is mutated immutably (new state object)
4. A **snapshot** is built: a renderer-ready view of the current state
5. The **renderer** displays the snapshot and waits for the next action

## Three Layers

### Content (Static)

Game content is defined in YAML and `.dlg` files. It never changes at runtime. Content is loaded into a `ContentRegistry`:

```typescript
interface ContentRegistry {
  locations: Record<string, Location>
  characters: Record<string, Character>
  items: Record<string, Item>
  maps: Record<string, Map>
  dialogues: Record<string, Dialogue>
  quests: Record<string, Quest>
  journalEntries: Record<string, JournalEntry>
  locales: Record<string, LocaleData>
}
```

### State (Dynamic)

Game state tracks everything that changes during play:

```typescript
interface GameState {
  currentLocation: string
  currentTime: { day: number; hour: number }
  flags: Record<string, boolean>
  variables: Record<string, number | string>
  inventory: string[]
  questProgress: Record<string, string>
  unlockedJournalEntries: string[]
  playerNotes: PlayerNote[]
  dialogueState: DialogueState | null
  characterState: Record<string, CharacterState>
  itemLocations: Record<string, string>
  mapEnabled: boolean
  notifications: string[]
  pendingSounds: string[]
  currentLocale: string
}
```

### Snapshot (Derived)

The snapshot is computed from state + registry. It enriches IDs with full entity data, resolves localization keys, and evaluates conditions to determine what's visible:

```typescript
interface Snapshot {
  location: SnapshotLocation      // Full location data
  charactersHere: SnapshotCharacter[]  // NPCs at current location
  party: SnapshotCharacter[]      // Party members
  dialogue: SnapshotDialogue | null    // Current dialogue or null
  choices: SnapshotChoice[]       // Available choices (condition-filtered)
  inventory: SnapshotItem[]       // Items with full data
  quests: SnapshotQuest[]         // Active quests
  journal: SnapshotJournalEntry[] // Unlocked entries
  variables: Record<string, number | string>
  time: { day: number; hour: number }
  map: SnapshotMap | null
  music: string
  ambient: string
  notifications: string[]
  pendingSounds: string[]
}
```

## Transient State

Some state is transient. It appears in exactly one snapshot and is then cleared:

- **notifications**: messages from `NOTIFY` effects
- **pendingSounds**: sounds from `SOUND` effects

After the engine builds a snapshot, it clears these arrays. This means the renderer doesn't need timers or cleanup logic; just render what's in the snapshot.

## Condition Evaluation

Conditions are evaluated at snapshot build time to determine:

- Which dialogue choices are visible (choices with failing `REQUIRE` are hidden)
- Which triggered dialogues should fire
- Which `IF` branches to take

This means the snapshot only contains valid, visible options. The renderer never needs to evaluate conditions.

## Effect Processing

Effects run in order when:

1. A dialogue node is reached (node effects)
2. A choice is selected (choice effects)

Effects mutate state: setting flags, adding items, changing quest stages, moving characters, etc. The engine builds a new snapshot after all effects have been applied.

## Package Separation

```
@doodle-engine/core    Engine, types, conditions, effects, parser, snapshot builder
@doodle-engine/react   React components, hooks, context provider
@doodle-engine/cli     Dev server, project scaffolder, production build
```

The core package has **no UI dependencies**. It can be used with any framework or runtime. The React package is one possible renderer. The CLI package provides development tooling.
