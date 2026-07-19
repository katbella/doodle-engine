---
title: Content Registry
description: How game content is loaded and organized.
---

The `ContentRegistry` is a read-only data structure that holds all game content. It is built at load time from the `content/` directory and is never modified by the engine or renderer during gameplay.

The registry organizes content by ID so the engine can find it without scanning project files during play.

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

Every content entity, such as a location or character, is indexed by its `id` field. For example, a location with `id: tavern` is stored at `registry.locations.tavern`.

## How Content is Loaded

The dev server (`npm run dev`) builds the registry automatically:

1. Scans `content/` subdirectories
2. Reads `.yaml` files as entities based on their directory
3. Converts `.dlg` files into dialogue data
4. Loads the translation entries from each locale file
5. Serves the complete registry via `/api/content`

### Loading by Directory

| Directory                   | Registry Field            | Loader                        |
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

**Locale files** use their filename as the locale code. For example, `en.yaml` becomes `registry.locales.en`.

**Dialogue files** use the filename without its extension as the dialogue ID. For example, `bartender_greeting.dlg` becomes `registry.dialogues.bartender_greeting`.

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

- Character `dialogue` field references a dialogue ID
- Character `location` field references a location ID
- Item `location` field references a location ID, `"inventory"`, or a character ID
- Map `locations[].id` references a location ID
- Dialogue `triggerLocation` references a location ID
- Interlude `triggerLocation` references a location ID
- `INTERLUDE <id>` references an interlude ID
- `GameConfig.startLocation` references a location ID
- `GameConfig.startInventory` contains item IDs

`npx doodle validate` and `npx doodle build` check these references before release. At runtime, the engine uses fallback behavior where possible: some actions leave state unchanged, and a missing location produces a fallback snapshot.
