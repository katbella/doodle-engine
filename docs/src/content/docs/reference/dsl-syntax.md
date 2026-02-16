---
title: DSL Syntax
description: Complete reference for the .dlg dialogue file format.
---

Dialogue files use the `.dlg` extension and contain a simple DSL (domain-specific language) for writing branching conversations. Unlike a general-purpose programming language, the dialogue DSL is a small set of keywords designed specifically for defining conversation nodes, choices, conditions, and effects.

## File Structure

A `.dlg` file consists of:

1. Optional `TRIGGER` declaration (auto-start on location entry)
2. Optional top-level `REQUIRE` conditions (for triggered dialogues)
3. One or more `NODE` blocks

```
TRIGGER tavern
REQUIRE notFlag seenIntro

NODE start
  NARRATOR: @narrator.intro
  SET flag seenIntro

  CHOICE @narrator.choice.continue
    END dialogue
  END
```

## Structure Keywords

### NODE

Defines a dialogue node, which is a single point in the conversation.

```
NODE greeting
  BARTENDER: @bartender.hello
```

The first `NODE` in the file is the start node (used as the dialogue's `startNode`).

### END

Closes a `CHOICE` or `IF` block:

```
CHOICE @option
  GOTO next
END
```

When used as `END dialogue`, it's an effect that closes the conversation:

```
CHOICE @goodbye
  END dialogue
END
```

### GOTO

Routes to another node (within a choice or as auto-advance):

```
CHOICE @option
  GOTO next_node
END
```

Or to a location (ends dialogue and moves player):

```
GOTO location market
```

### TRIGGER

Declares that this dialogue auto-starts when the player enters a location:

```
TRIGGER tavern
```

Must be at the top of the file, before any `NODE`.

### REQUIRE

Condition that must pass. At the top level (for triggered dialogues) or inside choice blocks:

```
# Top-level: controls when the trigger fires
TRIGGER tavern
REQUIRE notFlag seenIntro

# Inside a choice: controls when the choice is visible
CHOICE @buy_drink
  REQUIRE variableGreaterThan gold 4
  GOTO drink
END
```

## Dialogue Keywords

### Speaker Line

```
BARTENDER: @bartender.greeting
```

The text before `:` is the speaker name. It's matched to a character ID (case-insensitive). The text after `:` is the dialogue line (supports `@key` localization).

### NARRATOR

Narration with no speaker:

```
NARRATOR: @narrator.description
```

In the snapshot, the speaker is `null` and `speakerName` is `"Narrator"`.

### VOICE

Optional voice audio file for the current node:

```
VOICE bartender_greeting.ogg
```

### PORTRAIT

Optional portrait override (e.g., different expression):

```
PORTRAIT bartender_angry.png
```

## Choice Blocks

```
CHOICE @choice_text
  REQUIRE condition        # Optional, multiple allowed
  effect1                  # Optional effects
  effect2
  GOTO target_node         # Required destination
END
```

Choices are shown to the player as clickable options. They can have:
- **Conditions**: choice is hidden if any condition fails
- **Effects**: run when the choice is selected
- **GOTO**: where to go next (required)

## Conditional Blocks

```
IF condition
  GOTO target_node
END
```

or with effects:

```
IF hasFlag metBartender
  SET flag returningCustomer
  GOTO returning_greeting
END
```

IF blocks are evaluated in order. The first one whose condition passes fires its GOTO/effects.

## Effect Lines

Effects modify game state. See [Effects Reference](/doodle-engine/reference/effects/) for the full list.

```
SET flag metBartender
CLEAR flag doorLocked
SET variable gold 100
ADD variable gold -5
ADD item old_coin
REMOVE item rusty_key
MOVE item sword armory
SET questStage odd_jobs started
ADD journalEntry tavern_discovery
SET characterLocation merchant tavern
ADD toParty jaheira
REMOVE fromParty jaheira
SET relationship bartender 5
ADD relationship bartender 1
SET characterStat jaheira level 5
ADD characterStat jaheira health -10
SET mapEnabled false
ADVANCE time 2
START dialogue merchant_intro
END dialogue
MUSIC tension_theme.ogg
SOUND door_slam.ogg
VIDEO intro_cinematic.mp4
NOTIFY @notification.quest_started
```

## Localization Syntax

Text values support `@key` references:

```
BARTENDER: @bartender.greeting
CHOICE @bartender.choice.hello
NOTIFY @notification.quest_started
```

The `@key` is resolved at snapshot build time against the current locale's data. If the key isn't found, the raw `@key` string is shown (useful for spotting missing translations).

Quoted strings are used as literal text:

```
BARTENDER: "Hello there!"
```

## Comments

Lines starting with `#` are ignored:

```
# This is a comment
NODE start
  BARTENDER: @bartender.greeting  # Inline comments work too
```

If `#` appears inside a quoted string, it's preserved as text content.

## Complete Example

```
# Triggered narrator intro for the tavern
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: @narrator.tavern_intro
  SET flag seenTavernIntro

  CHOICE @narrator.choice.look_around
    END dialogue
  END

# Main bartender conversation (started by clicking the character)
NODE greeting
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.ask_rumors
    REQUIRE notFlag heardRumors
    SET flag heardRumors
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE @bartender.choice.buy_drink
    REQUIRE variableGreaterThan gold 4
    ADD variable gold -5
    ADD variable _drinksBought 1
    NOTIFY @notification.bought_drink
    GOTO after_drink
  END

  CHOICE @bartender.choice.ask_quest
    REQUIRE questAtStage odd_jobs started
    GOTO quest_update
  END

  CHOICE @bartender.choice.goodbye
    GOTO farewell
  END

NODE rumors
  BARTENDER: @bartender.rumors
  ADD item old_coin
  NOTIFY @notification.found_coin

  CHOICE @bartender.choice.interesting
    GOTO greeting
  END

NODE after_drink
  BARTENDER: @bartender.after_drink
  GOTO greeting

NODE quest_update
  BARTENDER: @bartender.quest_info
  SET questStage odd_jobs talked_to_merchant
  NOTIFY @notification.quest_updated
  GOTO greeting

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
```
