---
title: Content Registry
description: How game content is loaded and organized.
---

The `ContentRegistry` is a read-only data structure that holds all game content. It is built at load time from the `content/` directory and is never modified by the engine or renderer during gameplay.

The registry provides a single indexed source of truth for all static game data, allowing the engine to resolve IDs quickly and build snapshots without scanning files.

## Structure

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

Every entity is indexed by its `id` field. For example, a location with `id: tavern` is stored at `registry.locations.tavern`.

## How Content is Loaded

The dev server (`npm run dev`) builds the registry automatically:

1. Scans `content/` subdirectories
2. Parses `.yaml` files as entities based on their directory
3. Parses `.dlg` files with the dialogue parser
4. Loads locale files as flat key-value dictionaries
5. Serves the complete registry via `/api/content`

### Loading by Directory

| Directory                   | → Registry Field          | Loader                        |
| --------------------------- | ------------------------- | ----------------------------- |
| `content/locations/*.yaml`  | `registry.locations`      | YAML parse, keyed by `id`     |
| `content/characters/*.yaml` | `registry.characters`     | YAML parse, keyed by `id`     |
| `content/items/*.yaml`      | `registry.items`          | YAML parse, keyed by `id`     |
| `content/maps/*.yaml`       | `registry.maps`           | YAML parse, keyed by `id`     |
| `content/dialogues/*.dlg`   | `registry.dialogues`      | DSL parser, keyed by filename |
| `content/quests/*.yaml`     | `registry.quests`         | YAML parse, keyed by `id`     |
| `content/journal/*.yaml`    | `registry.journalEntries` | YAML parse, keyed by `id`     |
| `content/interludes/*.yaml` | `registry.interludes`     | YAML parse, keyed by `id`     |
| `content/locales/*.yaml`    | `registry.locales`        | YAML parse, keyed by filename |

### Special Cases

**Locale files** don't have an `id` field. They're keyed by filename: `en.yaml` → `registry.locales.en`.

**Dialogue files** use the filename (without extension) as the dialogue ID: `bartender_greeting.dlg` → `registry.dialogues.bartender_greeting`.

**game.yaml** is loaded separately as a `GameConfig`, not part of the registry.

## How the Engine Uses the Registry

The registry is passed to the `Engine` constructor:

```ts
const engine = new Engine(registry);
```

The engine uses the registry to:

- Look up location data when building snapshots
- Find character dialogues when `talkTo` is called
- Resolve localization keys and interpolate `{varName}` placeholders at snapshot time
- Check triggered dialogue and interlude conditions on location change
- Determine travel distances from map data

## Client-Side Loading

In the browser, the registry is fetched from the dev server:

```ts
const response = await fetch('/api/content');
const { registry, config } = await response.json();

const engine = new Engine(registry);
const snapshot = engine.newGame(config);
```

## Content References

Entities reference each other by ID:

- Character `dialogue` field → Dialogue ID
- Character `location` field → Location ID
- Item `location` field → Location ID, `"inventory"`, or Character ID
- Map `locations[].id` → Location ID
- Dialogue `triggerLocation` → Location ID
- Interlude `triggerLocation` → Location ID
- `INTERLUDE <id>` effect → Interlude ID
- GameConfig `startLocation` → Location ID
- GameConfig `startInventory` → Item IDs

These references are resolved when the engine looks them up. Runtime code tries to avoid crashing if something is missing. For example, some actions become no-ops and missing locations render a fallback snapshot. In normal projects, `doodle validate` and `doodle build` should catch broken references before release.
