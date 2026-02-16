---
title: CLI Commands
description: Reference for doodle dev, doodle build, and create-doodle-engine-game.
---

The `@doodle-engine/cli` package provides three commands.

## create-doodle-engine-game

Scaffold a new game project.

```bash
npx create-doodle-engine-game <project-name>
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
6. Triggers full page reload when content files change

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

---

## doodle build

Build the game for production.

```bash
doodle build
```

### What it does

1. Runs a Vite production build
2. Outputs to `dist/` directory
3. Bundles and optimizes all assets

### Preview

After building, preview the production build:

```bash
npx vite preview
```
