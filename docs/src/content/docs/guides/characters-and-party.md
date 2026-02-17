---
title: Characters & Party
description: How to create characters, manage relationships, and build a party.
---

## Defining a Character

Create `content/characters/bartender.yaml`:

```yaml
id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
stats: {}
```

| Field | Description |
|-------|-------------|
| `id` | Unique identifier, used in dialogue speaker lines and effects |
| `name` | Display name (supports `@key` localization) |
| `biography` | Character background text |
| `portrait` | Portrait image |
| `location` | Starting location ID |
| `dialogue` | Dialogue ID when the player talks to them |
| `stats` | Extensible stats object (e.g., `{ level: 5, class: "warrior" }`) |

## Characters at Location vs Party

The snapshot separates characters into two groups:

- **`charactersHere`**: NPCs at the player's current location (not in party). Shown in the main view as clickable characters.
- **`party`**: Characters traveling with the player. Shown in the sidebar.

A character in the party does **not** appear in `charactersHere`, even if their location matches.

## Talking to Characters

When a player clicks a character in `charactersHere`, the engine calls `talkTo(characterId)`. This starts the character's assigned dialogue (the `dialogue` field in their YAML).

```tsx
// In a custom renderer
const { actions } = useGame()
actions.talkTo('bartender')
```

## Relationships

Each character tracks a `relationship` value (starts at 0). Modify it with effects:

```
# Set to an absolute value
SET relationship bartender 5

# Add or subtract
ADD relationship bartender 1
ADD relationship bartender -2
```

Check relationships in conditions:

```
CHOICE @bartender.choice.secret_info
  REQUIRE relationshipAbove bartender 5
  GOTO secret
END

CHOICE @bartender.choice.hostile
  REQUIRE relationshipBelow bartender 0
  GOTO hostile_response
END
```

`relationshipAbove` and `relationshipBelow` are exclusive (strict greater/less than).

## Party Management

Add or remove characters from the party with effects:

```
# Add to party
ADD toParty merchant

# Remove from party
REMOVE fromParty merchant
```

Check party membership in conditions:

```
CHOICE @merchant.choice.party_talk
  REQUIRE characterInParty merchant
  GOTO party_dialogue
END
```

When a character joins the party, they travel with the player to every location.

## Moving Characters

Move NPCs between locations:

```
SET characterLocation merchant market
```

Check where a character is:

```
CHOICE @ask_about_merchant
  REQUIRE characterAt merchant market
  GOTO merchant_info
END
```

## Character Stats

Characters have an extensible `stats` object for custom data:

```
# Set a stat
SET characterStat elisa level 5

# Add to a numeric stat
ADD characterStat elisa health -10
```

Stats appear in the snapshot's `SnapshotCharacter.stats` and can be displayed in a custom renderer.
