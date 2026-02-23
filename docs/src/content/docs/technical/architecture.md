---
title: Architecture
description: Understanding the state → action → snapshot data flow.
---

Doodle Engine follows a one-way data flow pattern: **player actions go in, a new state is produced, and a snapshot comes out**.

## Overview

```text
Player Action → Engine → New State → Snapshot → Renderer
      ↑                                             |
      └─────────────────────────────────────────────┘
```

1. The **player** performs an action (talk to character, select choice, travel)
2. The **engine** processes the action, evaluating conditions and applying effects
3. A **new state** is produced (the previous state is not modified)
4. A **snapshot** is built: a renderer-ready view of the current state
5. The **renderer** displays the snapshot and waits for the next action

## Three Layers

### Content (Static)

Game content is defined in YAML and `.dlg` files. It never changes at runtime. Content is loaded into a `ContentRegistry`:

```ts
interface ContentRegistry {
    locations: Record<string, Location>;
    characters: Record<string, Character>;
    items: Record<string, Item>;
    maps: Record<string, Map>;
    dialogues: Record<string, Dialogue>;
    quests: Record<string, Quest>;
    journalEntries: Record<string, JournalEntry>;
    interludes: Record<string, Interlude>;
    locales: Record<string, LocaleData>;
}
```

### State (Dynamic)

Game state tracks everything that changes during play:

```ts
interface GameState {
    currentLocation: string;
    currentTime: { day: number; hour: number };
    flags: Record<string, boolean>;
    variables: Record<string, number | string>;
    inventory: string[];
    questProgress: Record<string, string>;
    unlockedJournalEntries: string[];
    playerNotes: PlayerNote[];
    dialogueState: DialogueState | null;
    characterState: Record<string, CharacterState>;
    itemLocations: Record<string, string>;
    mapEnabled: boolean;
    notifications: string[];
    pendingSounds: string[];
    pendingVideo: string | null;
    pendingInterlude: string | null;
    currentLocale: string;
}
```

### Snapshot (Derived)

The snapshot is computed from the current state and the content registry. It enriches IDs with full entity data, resolves localization keys, and evaluates conditions to determine what is visible:

```ts
interface Snapshot {
    location: SnapshotLocation;
    charactersHere: SnapshotCharacter[];
    party: SnapshotCharacter[];
    dialogue: SnapshotDialogue | null;
    choices: SnapshotChoice[];
    inventory: SnapshotItem[];
    quests: SnapshotQuest[];
    journal: SnapshotJournalEntry[];
    variables: Record<string, number | string>;
    time: { day: number; hour: number };
    map: SnapshotMap | null;
    music: string;
    ambient: string;
    notifications: string[];
    pendingSounds: string[];
    pendingVideo: string | null;
    pendingInterlude: SnapshotInterlude | null;
}
```

## Transient State

Some state is transient. It appears in exactly one snapshot and is then cleared:

- **notifications**: messages from `NOTIFY` effects
- **pendingSounds**: sounds from `SOUND` effects
- **pendingVideo**: file from `VIDEO` effects (show once, then null)
- **pendingInterlude**: interlude ID from `INTERLUDE` effects or auto-trigger (show once, then null)

After a snapshot is produced, the engine clears these fields in the next state. The renderer simply renders what is in the snapshot; no timers or cleanup are required.

## Condition Evaluation

Conditions are evaluated at snapshot build time to determine:

- Which dialogue choices are visible (choices with failing `REQUIRE` are hidden)
- Which triggered dialogues activate
- Which `IF` branches to take

This means the snapshot only contains valid, visible options. The renderer never evaluates conditions.

## Effect Processing

Effects run in order when:

1. A dialogue node is reached (node effects)
2. A choice is selected (choice effects)
3. An interlude triggers (interlude `effects` field, typically `setFlag` to prevent repeats)

Effects produce a new state: setting flags, adding items, changing quest stages, moving characters, queuing interludes, rolling dice into variables, and similar operations. The engine builds a new snapshot after all effects have been applied.

## Package Separation

```text
@doodle-engine/core    Engine, types, conditions, effects, parser, snapshot builder
@doodle-engine/react   React components, hooks, context provider
@doodle-engine/cli     Dev server, project scaffolder, production build
```

The core package has no UI or framework dependencies. It can be used with any framework or runtime. The React package is one possible renderer. The CLI package provides development tooling.
