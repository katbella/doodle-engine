---
title: CLI Commands
description: Reference for doodle create, doodle dev, doodle build, and doodle validate.
---

The `@doodle-engine/cli` package provides four commands: `doodle create`, `doodle dev`, `doodle build`, and `doodle validate`.

## doodle create

Scaffold a new game project.

```bash
npx @doodle-engine/cli create <project-name>
```

### Prompts

1. **Use default renderer?** Yes uses `GameRenderer` for a complete out-of-the-box UI. No sets up a skeleton `App.tsx` with `useGame` for building a custom renderer.

### What it creates

```
<project-name>/
  content/
    characters/bartender.yaml, merchant.yaml
    dialogues/tavern_intro.dlg, market_intro.dlg,
              bartender_greeting.dlg, merchant_intro.dlg
    items/old_coin.yaml
    journal/tavern_discovery.yaml, odd_jobs_accepted.yaml,
            market_square.yaml
    locales/en.yaml
    locations/tavern.yaml, market.yaml
    maps/town.yaml
    quests/odd_jobs.yaml
    game.yaml
  assets/
    images/
    audio/
    fonts/
    maps/
  src/
    main.tsx
    App.tsx
    index.css
  index.html
  package.json
  tsconfig.json
  .gitignore
```

### Post-install

```bash
cd <project-name>
yarn install
yarn dev
```

---

## doodle dev

Start the development server with content hot-reload.

```bash
doodle dev
```

### What it does

1. Starts a Vite dev server on port 3000
2. Loads all content from `content/` directory
3. Parses `.yaml` files as entities and `.dlg` files as dialogues
4. Serves content via the `/api/content` endpoint as JSON
5. Watches `content/**/*` for changes using chokidar
6. **Validates content on every file change** and prints errors to the terminal
7. Triggers full page reload when content files change
8. **Exposes `window.doodle` dev tools API** in the browser console (dev mode only)

### Content loading

| Directory | File Type | How it's loaded |
|-----------|-----------|-----------------|
| `characters/` | `.yaml` | Parsed as Character entity |
| `dialogues/` | `.dlg` | Parsed with `parseDialogue()` |
| `items/` | `.yaml` | Parsed as Item entity |
| `journal/` | `.yaml` | Parsed as JournalEntry entity |
| `locales/` | `.yaml` | Loaded as flat key-value dict, keyed by filename |
| `locations/` | `.yaml` | Parsed as Location entity |
| `maps/` | `.yaml` | Parsed as Map entity |
| `quests/` | `.yaml` | Parsed as Quest entity |
| `game.yaml` | `.yaml` | Parsed as GameConfig |

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

Validation errors are printed to the terminal but **do not stop the dev server**. You can continue working while fixing errors.

Example validation output:

```
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
doodle.setFlag('quest_started')
doodle.clearFlag('quest_started')

// Variable manipulation
doodle.setVariable('gold', 100)
doodle.getVariable('gold')

// Location control
doodle.teleport('tavern')

// Dialogue control
doodle.triggerDialogue('bartender_greeting')

// Quest control
doodle.setQuestStage('odd_jobs', 'in_progress')

// Inventory control
doodle.addItem('old_coin')
doodle.removeItem('old_coin')

// Inspection
doodle.inspect()           // Show current state and available commands
doodle.inspectState()      // Return full game state object
doodle.inspectRegistry()   // Return content registry object
```

**Dev tools are automatically removed from production builds** via Vite's tree-shaking.

---

## doodle build

Build the game for production.

```bash
doodle build
```

### What it does

1. **Validates all content first** and fails if errors are found
2. Runs a Vite production build
3. Outputs to `dist/` directory
4. Bundles and optimizes all assets
5. Strips dev tools from production bundle

If validation errors are found, the build will exit with code 1 and display the errors. Fix all validation errors before deploying to production.

### Preview

After building, preview the production build:

```bash
npx vite preview
```

---

## doodle validate

Validate all game content without building or running the dev server.

```bash
doodle validate
```

### What it validates

- **Dialogue structure**
  - `startNode` exists in dialogue
  - No duplicate node IDs within a dialogue
  - All GOTO targets (from `node.next`, `choice.next`, `conditionalNext`) point to existing nodes
- **Conditions**
  - `hasFlag`/`notFlag` have `flag` argument
  - `hasItem`/`notItem` have `item` argument
  - `questAtStage` has `quest` and `stage` arguments
  - `variableEquals`/`variableGreaterThan`/`variableLessThan` have `variable` and `value` arguments
- **Effects**
  - `setFlag`/`clearFlag` have `flag` argument
  - `setVariable`/`addVariable` have `variable` and `value` arguments
  - `addItem`/`removeItem` have `item` argument
  - `moveItem` has `item` and `location` arguments
  - `setQuestStage` has `quest` and `stage` arguments
  - `addJournalEntry` has `entry` argument
  - `setCharacterLocation` has `character` and `location` arguments
  - `addToParty`/`removeFromParty` have `character` argument
  - `setRelationship`/`addRelationship` have `character` and `value` arguments
  - `setCharacterStat`/`addCharacterStat` have `character`, `stat`, and `value` arguments
  - `setMapEnabled` has `enabled` argument
  - `advanceTime` has `hours` argument
  - `goToLocation` has `location` argument
  - `startDialogue` has `dialogue` argument
  - `playMusic`/`playSound` have `file` argument
  - `playVideo` has `file` argument
  - `notify` has `message` argument
- **Character dialogue references**
  - Characters' `dialogue` field points to existing dialogue IDs
- **Localization keys**
  - All `@key` references in locations, characters, items, quests, journal entries, and dialogues exist in at least one locale file

### Exit codes

- **0**: No validation errors found
- **1**: Validation errors found

### Example output

```
🐾 Validating Doodle Engine content...

✓ No validation errors
```

Or with errors:

```
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
- **CI/CD pipelines**: Add `doodle validate` to your CI workflow to catch content errors early
- **Manual testing**: Run validation without starting the full dev server
