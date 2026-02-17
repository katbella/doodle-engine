---
title: YAML Schemas
description: Schema reference for all YAML entity types.
---

All content entities are defined in YAML files placed in the appropriate `content/` subdirectory.

## Location

**Directory:** `content/locations/`

```yaml
id: tavern
name: "@location.tavern.name"
description: "@location.tavern.description"
banner: tavern.png
music: tavern_ambience.ogg
ambient: fire_crackling.ogg
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name (supports `@key`) |
| `description` | `string` | Text shown at this location |
| `banner` | `string` | Banner image filename |
| `music` | `string` | Background music track |
| `ambient` | `string` | Ambient sound loop |

## Character

**Directory:** `content/characters/`

```yaml
id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
stats: {}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name (supports `@key`) |
| `biography` | `string` | Character background text |
| `portrait` | `string` | Portrait image filename |
| `location` | `string` | Starting location ID |
| `dialogue` | `string` | Dialogue ID for conversations |
| `stats` | `Record<string, unknown>` | Extensible stats object |

## Item

**Directory:** `content/items/`

```yaml
id: old_coin
name: "@item.old_coin.name"
description: "@item.old_coin.description"
icon: old_coin_icon.png
image: old_coin.png
location: inventory
stats: {}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name (supports `@key`) |
| `description` | `string` | Full description |
| `icon` | `string` | Small icon for inventory grid |
| `image` | `string` | Large image for detail view |
| `location` | `string` | Starting location: location ID, `"inventory"`, or character ID |
| `stats` | `Record<string, unknown>` | Extensible stats object |

## Map

**Directory:** `content/maps/`

```yaml
id: town
name: "@map.town.name"
image: town_map.png
scale: 1
locations:
  - id: tavern
    x: 200
    y: 350
  - id: market
    x: 500
    y: 200
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name (supports `@key`) |
| `image` | `string` | Map background image |
| `scale` | `number` | Distance-to-travel-time multiplier |
| `locations` | `MapLocation[]` | Location markers |

### MapLocation

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Location ID (must match a location entity) |
| `x` | `number` | X coordinate on the map image |
| `y` | `number` | Y coordinate on the map image |

## Quest

**Directory:** `content/quests/`

```yaml
id: odd_jobs
name: "@quest.odd_jobs.name"
description: "@quest.odd_jobs.description"
stages:
  - id: started
    description: "@quest.odd_jobs.stage.started"
  - id: talked_to_merchant
    description: "@quest.odd_jobs.stage.talked_to_merchant"
  - id: complete
    description: "@quest.odd_jobs.stage.complete"
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name (supports `@key`) |
| `description` | `string` | Quest description |
| `stages` | `QuestStage[]` | Ordered list of quest stages |

### QuestStage

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stage identifier (used with `SET questStage`) |
| `description` | `string` | Text shown in journal for this stage |

## JournalEntry

**Directory:** `content/journal/`

```yaml
id: tavern_discovery
title: "@journal.tavern_discovery.title"
text: "@journal.tavern_discovery.text"
category: places
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `title` | `string` | Display title (supports `@key`) |
| `text` | `string` | Entry content |
| `category` | `string` | Category for grouping (e.g., `"lore"`, `"people"`, `"places"`, `"quest"`) |

## Interlude

**Directory:** `content/interludes/`

```yaml
id: chapter_one
background: /assets/images/banners/dusk_road.jpg
text: |
  Chapter One: A New Beginning

  The road behind you stretches long and empty.
  Ahead, the lights of town flicker through the evening mist.
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `background` | `string` | Yes | Background image path |
| `text` | `string` | Yes | Narrative text (supports `@key`) |
| `banner` | `string` | No | Optional decorative frame/border image |
| `music` | `string` | No | Music track to play |
| `voice` | `string` | No | Narration audio file |
| `sounds` | `string[]` | No | Ambient sounds to play |
| `scroll` | `boolean` | No | Auto-scroll text (default: `true`) |
| `scrollSpeed` | `number` | No | Auto-scroll speed in px/s (default: `30`) |
| `triggerLocation` | `string` | No | Location ID where this auto-triggers on enter |
| `triggerConditions` | `Condition[]` | No | Conditions that must pass for auto-trigger |
| `effects` | `Effect[]` | No | Effects applied when the interlude triggers (e.g. set a "seen" flag) |

Triggered via the `INTERLUDE <id>` DSL effect, or automatically when traveling to `triggerLocation` if all `triggerConditions` pass. See the [Interludes guide](/doodle-engine/guides/interludes/).

## GameConfig

**File:** `content/game.yaml`

```yaml
id: game
startLocation: tavern
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables:
  gold: 100
  reputation: 0
  _drinksBought: 0
startInventory: []
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Must be `"game"` |
| `startLocation` | `string` | Starting location ID |
| `startTime` | `{ day: number, hour: number }` | Starting time |
| `startFlags` | `Record<string, boolean>` | Initial flags |
| `startVariables` | `Record<string, number \| string>` | Initial variables |
| `startInventory` | `string[]` | Item IDs the player starts with |

## Locale

**Directory:** `content/locales/`

Locale files are flat key-value dictionaries (not entities). They're loaded by filename.

```yaml
# content/locales/en.yaml
location.tavern.name: "The Rusty Tankard"
location.tavern.description: "A cozy tavern with worn wooden tables."
character.bartender.name: "Greta"
bartender.greeting: "Welcome! What can I do for you?"
```

| Key | Value |
|-----|-------|
| Any string | Translated text |

Referenced with `@key` syntax in other content files. See [Localization](/doodle-engine/guides/localization/).
