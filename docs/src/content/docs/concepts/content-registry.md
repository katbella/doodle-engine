---
title: Content Registry
description: How game content is loaded and organized.
---

The `ContentRegistry` is a read-only data structure that holds all game content. It's built at load time from the `content/` directory and never changes during gameplay.

## Structure

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

Every entity is indexed by its `id` field. For example, a location with `id: tavern` is stored at `registry.locations.tavern`.

## How Content is Loaded

The dev server (`doodle dev`) builds the registry automatically:

1. Scans `content/` subdirectories
2. Parses `.yaml` files as entities based on their directory
3. Parses `.dlg` files with the dialogue parser
4. Loads locale files as flat key-value dictionaries
5. Serves the complete registry via `/api/content`

### Loading by Directory

| Directory | → Registry Field | Loader |
|-----------|-----------------|--------|
| `content/locations/*.yaml` | `registry.locations` | YAML parse, keyed by `id` |
| `content/characters/*.yaml` | `registry.characters` | YAML parse, keyed by `id` |
| `content/items/*.yaml` | `registry.items` | YAML parse, keyed by `id` |
| `content/maps/*.yaml` | `registry.maps` | YAML parse, keyed by `id` |
| `content/dialogues/*.dlg` | `registry.dialogues` | DSL parser, keyed by filename |
| `content/quests/*.yaml` | `registry.quests` | YAML parse, keyed by `id` |
| `content/journal/*.yaml` | `registry.journalEntries` | YAML parse, keyed by `id` |
| `content/locales/*.yaml` | `registry.locales` | YAML parse, keyed by filename |

### Special Cases

**Locale files** don't have an `id` field. They're keyed by filename: `en.yaml` → `registry.locales.en`.

**Dialogue files** use the filename (without extension) as the dialogue ID: `bartender_greeting.dlg` → `registry.dialogues.bartender_greeting`.

**game.yaml** is loaded separately as a `GameConfig`, not part of the registry.

## Using the Registry

The registry is passed to the `Engine` constructor:

```typescript
const engine = new Engine(registry, initialState)
```

The engine uses the registry to:

- Look up location data when building snapshots
- Find character dialogues when `talkTo` is called
- Resolve localization keys at snapshot time
- Check triggered dialogue conditions on location change
- Determine travel distances from map data

## Client-Side Loading

In the browser, the registry is fetched from the dev server:

```typescript
const response = await fetch('/api/content')
const { registry, config } = await response.json()

const engine = new Engine(registry, createInitialState(config))
```

## Content References

Entities reference each other by ID:

- Character `dialogue` field → Dialogue ID
- Character `location` field → Location ID
- Item `location` field → Location ID, `"inventory"`, or Character ID
- Map `locations[].id` → Location ID
- Dialogue `triggerLocation` → Location ID
- GameConfig `startLocation` → Location ID
- GameConfig `startInventory` → Item IDs

These references are validated at runtime when the engine tries to look them up. Missing references are handled gracefully (the action is a no-op).
