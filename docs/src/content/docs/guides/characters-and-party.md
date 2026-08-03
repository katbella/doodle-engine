---
title: Characters & Party
description: How to create characters, manage relationships, and build a party.
---

Characters give the player people to meet, speak with, build relationships with, and invite into the party. Each character begins at an assigned location and can move as the story changes.

This guide works through the character file, the difference between characters at a location and the party, relationships, stats, and the player's own profile. Examples edit files directly. In Doodle Studio, the same fields appear when you select a character in the project rail.

## Defining a Character

Each character is one YAML file in `content/characters/`. The starter project ships two, `bartender.yaml` and `merchant.yaml`. This is `content/characters/bartender.yaml`:

```yaml
id: bartender
name: "Marcus the Bartender"
title: ""
biography: "A gruff man with kind eyes who's heard every story twice. He keeps the peace at The Salty Dog with a firm hand and a generous pour."
portrait: ""
location: tavern
dialogue: bartender_greeting
stats: {}
```

The starter characters leave `title`, `portrait`, and `stats` empty. `title` takes an optional player-facing title, `portrait` names an image in `assets/images/portraits/`, and the [Character Stats](#character-stats) section below covers what goes in `stats`.

| Field       | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| `id`        | Unique identifier, used in dialogue speaker lines and effects         |
| `name`      | Display name                                                          |
| `title`     | Optional title                                                        |
| `biography` | Character background text                                             |
| `portrait`  | Portrait image                                                        |
| `location`  | Starting location ID                                                  |
| `dialogue`  | Dialogue ID when the player talks to them                             |
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

:::note
`relationshipAbove` and `relationshipBelow` use strict comparisons, so the threshold itself does not pass. `REQUIRE relationshipAbove bartender 5` needs a relationship of 6 or more.
:::

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

Stats are character-specific traits. They are separate from variables such as
gold, reputation, or quest progress. A stat key is used by game logic, while
its `name` and string `value` can use localization keys:

```yaml
stats:
    strength:
        name: '@stat.strength'
        value: 16.2
    class:
        name: '@stat.class'
        value: '@class.ranger'
    _storyScore:
        name: Story score
        value: 4
```

Stat values can only be numbers or strings. A key beginning with `_` is hidden
from the built-in character sheet, but conditions, effects, and interpolation
can still use it. The older shorthand `strength: 16.2` remains valid and uses
the key as the display name.

Use the three stat conditions to branch on a stat:

```text
REQUIRE characterStatEquals player class @class.ranger
REQUIRE characterStatGreaterThan player strength 16.1
REQUIRE characterStatLessThan elisa strength 18
```

Equality supports numbers and strings. Greater-than and less-than checks are
strict and only pass for numeric stats. Values are not converted between
strings and numbers.

Set a string or numeric value, or add to a numeric value:

```text
SET characterStat elisa level 5
ADD characterStat elisa health -10
SET characterStat player class @class.ranger
ADD characterStat player strength 0.5
```

Use character and player data in dialogue, choices, and notifications:

```text
NARRATOR: "{player.name}, {elisa.title} is watching."
ELISA: "Ah, you're a {player.stats.class}!"
NARRATOR: "Strength: {player.stats.strength}."
```

Missing placeholders remain unchanged.

## Player Profile and Party Sheets

The player's profile and starting stats live in `content/player.yaml`. To let
the player enter their own profile in the built-in renderer, enable the behavior
in `content/game.yaml`:

```yaml
# content/game.yaml
playerCreatesProfile: true
```

Define the player character and starting stats in `content/player.yaml`:

```yaml
# content/player.yaml
name: '@player.name'
title: ''
biography: ''
portrait: ''
stats:
    strength:
        name: Strength
        value: 10
```

The start modal asks for a required name plus an optional title and biography.
The modal uses the localized UI strings for its labels and input hints, along
with a generic emblem, and it has no portrait upload.

To provide a fixed protagonist instead, omit `playerCreatesProfile` or set it
to `false` in `game.yaml`. The `name`, `title`, `biography`, and `portrait`
values in `player.yaml` are then used directly. When profile entry is enabled,
the entered name, title, and biography replace those profile values for the
save. If `player.yaml` is absent, the engine supplies a generic player with no
stats.

The built-in renderer has a dedicated Party action in its bottom bar. Its
character sheet starts with the player, then cycles through current party
members with Previous and Next controls. Characters at the current location
still start dialogue when selected. Opening the Party panel is the separate way
to inspect stats.

Player profile text and all character stats are included in saves. Characters
without a `title`, projects without `player.yaml`, and old scalar stat entries
continue to work.

## Check Your Work

Run `npm run validate`, or select **Validate** in Studio. It confirms the character's `location` and `dialogue` references exist and that stat definitions are well-formed. Then visit the character's location in the running game: they should appear among the characters there, and selecting them should start their dialogue.

A character usually exists to be talked to, so [Writing Dialogues](/guides/writing-dialogues/) is the natural next step. [Creating Quests](/guides/creating-quests/) shows how those conversations drive longer objectives.
