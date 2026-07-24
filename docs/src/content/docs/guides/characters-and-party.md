---
title: Characters & Party
description: How to create characters, manage relationships, and build a party.
---

Characters give the player people to meet, speak with, build relationships with, and invite into the party. Each character begins at an assigned location and can move as the story changes.

## Defining a Character

Create `content/characters/bartender.yaml`:

```yaml
id: bartender
name: Marcus the Bartender
biography: A gruff man with kind eyes who has heard every story twice.
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
stats: {}
```

| Field       | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `id`        | Unique identifier, used in dialogue speaker lines and effects    |
| `name`      | Display name                                                      |
| `biography` | Character background text                                        |
| `portrait`  | Portrait image                                                   |
| `location`  | Starting location ID                                             |
| `dialogue`  | Dialogue ID when the player talks to them                        |
| `stats`     | Stats for game-specific data (e.g., `{ level: 5, class: "warrior" }`) |

## Characters at Location vs Party

The engine sends the renderer a snapshot, a current view of the game data to display. It separates characters into two groups:

- **`charactersHere`**: NPCs at the player's current location who are not in the party. The interface can present them as buttons, portraits, names, or another selectable form.
- **`party`**: Characters traveling with the player. Shown in the sidebar.

A character in the party does **not** appear in `charactersHere`, even if their location matches.

## Talking to Characters

When a player selects a character in the interface, the renderer calls `talkTo(characterId)`. This starts the character's assigned dialogue from the `dialogue` field in their YAML.

```tsx
// In a custom renderer
const { actions } = useGame();
actions.talkTo('bartender');
```

## Relationships

Each character tracks a `relationship` value (starts at 0). Modify it with effects:

```text
# Set to an absolute value
SET relationship bartender 5

# Add or subtract
ADD relationship bartender 1
ADD relationship bartender -2
```

Check relationships in conditions:

```text
CHOICE Ask what Marcus is hiding.
  REQUIRE relationshipAbove bartender 5
  GOTO secret
END

CHOICE Demand an answer.
  REQUIRE relationshipBelow bartender 0
  GOTO hostile_response
END
```

`relationshipAbove` and `relationshipBelow` use strict comparisons, so the threshold itself does not pass the condition.

## Party Management

Add or remove characters from the party with effects:

```text
# Add to party
ADD toParty merchant

# Remove from party
REMOVE fromParty merchant
```

Check party membership in conditions:

```text
CHOICE Ask how the journey is going.
  REQUIRE characterInParty merchant
  GOTO party_dialogue
END
```

When a character joins the party, they travel with the player to every location.

## Moving Characters

Move NPCs between locations:

```text
SET characterLocation merchant market
```

Check where a character is:

```text
CHOICE Ask where the merchant went.
  REQUIRE characterAt merchant market
  GOTO merchant_info
END
```

## Character Stats

Characters have a `stats` object for game-specific data:

```text
# Set a stat
SET characterStat elisa level 5

# Add to a numeric stat
ADD characterStat elisa health -10
```

Character stats are available to the renderer as `SnapshotCharacter.stats`. See [Custom Renderer](/technical/custom-renderer/) for using snapshot data in your own interface.
