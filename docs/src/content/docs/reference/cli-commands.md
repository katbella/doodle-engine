---
title: CLI Commands
description: Reference for the Doodle Engine command-line tools.
---

The `@doodle-engine/cli` package provides the commands used by each game project: `npx doodle dev`, `npx doodle build`, and `npx doodle validate`.

New projects provide these npm scripts:

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run validate` checks the game content
- `npm run preview` runs `vite preview`

## npx doodle create

Create a game project in the current folder:

```bash
npx doodle create my-game
```

The command asks how you want to begin:

- **Playable example story** creates a small connected game you can explore and replace piece by piece.
- **Minimal project** creates one starting location and leaves the other content sections ready for your work.

You will also choose how the project stores text. Start with English written directly in the content, or include an English and Swedish localization example. Either localization choice works with either starting-content choice.

The **default React renderer** provides a ready-to-use React interface that can be customized later. If you select it, you can also include the starter styles.

## npx doodle dev

Start the development server with content hot-reload.

```bash
npm run dev
```

### What it does

1. Starts a Vite dev server on port 3000
2. Loads all content from `content/` directory
3. Parses `.yaml` files as entities and `.dlg` files as dialogues
4. Serves content via the `/api/content` endpoint as JSON
5. Generates the asset manifest for each request and serves it at `/api/manifest`
6. Watches `content/**/*` for changes using chokidar
7. **Validates content on every file change** and prints errors to the terminal
8. Triggers full page reload when content files change
9. Serves the app in development mode. Generated apps pass `devTools={import.meta.env.DEV}`, which exposes `window.doodle` while the game is running.

### Content loading

| Directory     | File Type | How it's loaded                                                          |
| ------------- | --------- | ------------------------------------------------------------------------ |
| `characters/` | `.yaml`   | Parsed as Character entity                                               |
| `dialogues/`  | `.dlg`    | Parsed with `parseDialogue()`                                            |
| `interludes/` | `.yaml`   | Parsed as Interlude entity                                               |
| `items/`      | `.yaml`   | Parsed as Item entity                                                    |
| `journal/`    | `.yaml`   | Parsed as JournalEntry entity                                            |
| `locales/`    | `.yaml`   | Loaded as translation entries, with the filename used as the locale code |
| `locations/`  | `.yaml`   | Parsed as Location entity                                                |
| `maps/`       | `.yaml`   | Parsed as Map entity                                                     |
| `quests/`     | `.yaml`   | Parsed as Quest entity                                                   |
| `game.yaml`   | `.yaml`   | Parsed as GameConfig                                                     |

### /api/content response

```json
{
  "registry": {
    "locations": { ... },
    "characters": { ... },
    "items": { ... },
    "maps": { ... },
    "dialogues": { ... },
    "quests": { ... },
    "journalEntries": { ... },
    "interludes": { ... },
    "locales": { ... }
  },
  "config": {
    "startLocation": "tavern",
    "startTime": { "day": 1, "hour": 8 },
    ...
  }
}
```

### Content validation

When content files change, the dev server automatically validates:

- **Dialogue structure**: GOTO targets exist, no duplicate node IDs, startNode exists
- **Conditions & Effects**: Required arguments are present (e.g., `hasFlag` needs `flag`, `setVariable` needs `variable` and `value`)
- **Character references**: Characters' dialogue IDs point to existing dialogues
- **Localization keys**: All `@key` references exist in locale files

Validation errors appear in the terminal while the development server continues running.

Example validation output:

```text
✗ Found 2 validation errors:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "invalid_node" points to non-existent node
  Add NODE invalid_node or fix the GOTO target

content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
  Create dialogue "merchant_chat" or fix the reference
```

### Dev Tools API

In development mode, a `window.doodle` object is exposed in the browser console with debugging utilities:

```js
// Flag manipulation
doodle.setFlag('quest_started');
doodle.clearFlag('quest_started');

// Variable manipulation
doodle.setVariable('gold', 100);
doodle.getVariable('gold');

// Location control
doodle.teleport('tavern');

// Dialogue control
doodle.triggerDialogue('bartender_greeting');

// Quest control
doodle.setQuestStage('odd_jobs', 'in_progress');

// Inventory control
doodle.addItem('old_coin');
doodle.removeItem('old_coin');

// Inspection
doodle.inspect(); // Show current state and available commands
doodle.inspectState(); // View current progress and game state
doodle.inspectRegistry(); // View all loaded game content
```

The inspection commands return copies, so exploring their results does not change the running game.

New applications pass `devTools={import.meta.env.DEV}`, which includes `window.doodle` during development and omits it from production builds.

---

## npx doodle build

Build the game for production.

```bash
npm run build
```

### What it does

1. **Validates all content first** and fails if errors are found
2. Generates the asset manifest and fails if referenced local assets under `assets/` are missing
3. Runs a Vite production build with relative URLs, so the output works at a domain root or hosted under a folder
4. Outputs to `dist/` directory
5. Copies project assets to `dist/assets/`
6. Builds with Vite production settings. Generated applications omit `window.doodle` from production builds.
7. **Writes `dist/asset-manifest.json`** listing all game assets with types, sizes, and tiers
8. **Generates `dist/sw.js`**, a service worker that caches the app, the content, and the assets, so the game keeps working offline after the first visit
9. Writes manifest to `dist/api/manifest` so `vite preview` can serve it

Validation errors stop the build and return exit code 1. The terminal displays each error to fix before building again.

### Preview

After building, preview the production build:

```bash
npx vite preview
```

---

## npx doodle validate

Validate all game content without building or running the dev server.

```bash
npm run validate
```

### What it validates

- **Dialogue structure**
    - `startNode` exists in dialogue
    - No duplicate node IDs within a dialogue
    - All GOTO targets (from `node.next`, `choice.next`, `conditionalBranches[].next`) point to existing nodes
    - IF branch conditions and effects have required arguments
- **Conditions**
    - `hasFlag`/`notFlag` have `flag` argument
    - `hasItem` has `itemId` argument
    - `questAtStage` has `questId` and `stageId` arguments
    - `variableEquals`/`variableGreaterThan`/`variableLessThan` have `variable` and `value` arguments
    - Built-in condition references point to existing locations, items, characters, quests, and quest stages
- **Effects**
    - Node, choice, and IF branch effects are validated
    - `setFlag`/`clearFlag` have `flag` argument
    - `setVariable`/`addVariable` have `variable` and `value` arguments
    - `addItem`/`removeItem` have `itemId` argument
    - `moveItem` has `itemId` and `locationId` arguments
    - `setQuestStage` has `questId` and `stageId` arguments
    - `addJournalEntry` has `entryId` argument
    - `setCharacterLocation` has `characterId` and `locationId` arguments
    - `addToParty`/`removeFromParty` have `characterId` argument
    - `setRelationship`/`addRelationship` have `characterId` and `value` arguments
    - `setCharacterStat`/`addCharacterStat` have `characterId`, `stat`, and `value` arguments
    - `setMapEnabled` has `enabled` argument
    - `advanceTime` has `hours` argument
    - `goToLocation` has `locationId` argument
    - `startDialogue` has `dialogueId` argument
    - `playMusic` has no required argument; bare `MUSIC` clears the override
    - `playSound` has `sound` argument
    - `playVideo` has `file` argument
    - `notify` has `message` argument
    - `showInterlude` has `interludeId` argument
    - `roll` has `variable`, `min`, and `max` arguments
    - Built-in effect references point to existing locations, items, characters, quests, quest stages, journal entries, dialogues, and interludes
- **Character dialogue references**
    - Characters' `dialogue` field points to existing dialogue IDs
- **Content references**
    - `game.yaml` `startLocation` and `startInventory` point to existing content
    - Character starting locations exist
    - Item starting locations are `inventory`, an existing location, or an existing character
    - Dialogue and interlude trigger locations exist
    - Maps reference existing locations, and a location appears on at most one map
- **Localization keys**
    - All `@key` references in locations, characters, items, quests, journal entries, dialogues, and interludes exist in at least one locale file

### Exit codes

- **0**: No validation errors found
- **1**: Validation errors found

### Example output

```text
🐾 Validating Doodle Engine content...

✓ No validation errors
```

Or with errors:

```text
🐾 Validating Doodle Engine content...

✗ Found 3 validation errors:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "continue" points to non-existent node
  Add NODE continue or fix the GOTO target

content/dialogues/bartender_greeting.dlg
  Node "ask_rumors" condition "hasFlag" missing required "flag" argument

content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
  Create dialogue "merchant_chat" or fix the reference
```

### When to use

- **Before committing**: Validate content changes before pushing to version control
- **Continuous integration (CI)**: Add `npm run validate` to an automated check for pushed changes
- **Manual testing**: Run validation without starting the full dev server
