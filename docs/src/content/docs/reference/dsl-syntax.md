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
  GOTO target_node         # Destination (see below)
END
```

Choices are shown to the player as clickable options. They can have:
- **Conditions**: choice is hidden if any condition fails
- **Effects**: run when the choice is selected
- **GOTO**: required unless the choice terminates the dialogue

A choice terminates the dialogue (no GOTO needed) when it contains `END dialogue` or `GOTO location`:

```
# Terminal choice: ends the dialogue
CHOICE "Look around."
  END dialogue
END

# Terminal choice: ends dialogue and travels to location
CHOICE "Head to the market."
  GOTO location market
END
```

## Conditional Blocks (IF)

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

**How IF blocks work:**

1. IF blocks are evaluated **in order** (top to bottom) after the node's effects run
2. The **first** condition that passes determines where to go next
3. If no IF conditions pass, the node falls through to its regular `GOTO` (if present)
4. IF blocks are **invisible to the player**: they create author-controlled branching
5. Multiple IF blocks can exist in a node, but only the first passing one executes

**Example:**

```
NODE check_reputation
  BARTENDER: @bartender.sizing_you_up

  IF variableGreaterThan reputation 50
    GOTO trusted_path
  END

  IF variableGreaterThan reputation 20
    GOTO neutral_path
  END

  GOTO suspicious_path
```

If reputation is 60, goes to `trusted_path`. If reputation is 30, goes to `neutral_path`. If reputation is 10, goes to `suspicious_path`.

## Auto-Advancing Nodes

A node that has **no `CHOICE` blocks** is never shown to the player as a prompt. The engine processes it silently and advances automatically:

1. Node effects run (speaker lines are set as the current dialogue text, effects apply)
2. IF blocks evaluate in order — first passing condition redirects to its target
3. If no IF passes, the top-level `GOTO` fires
4. If there is no GOTO and no IF passes, the dialogue ends

This is the basis for **silent processing nodes** — nodes that apply effects or branch on state without giving the player any visible choice:

```
# Roll the dice and branch — player never sees this node as a prompt
NODE skill_check
  ROLL result 1 20
  IF variableGreaterThan result 14
    GOTO success
  END
  GOTO failure

NODE success
  BARTENDER: "Impressive. This one's on the house."

  CHOICE "Cheers!"
    GOTO start
  END

NODE failure
  BARTENDER: "Nope. Five gold."

  CHOICE "Fine."
    ADD variable gold -5
    GOTO start
  END
```

A node can also auto-advance unconditionally with a bare `GOTO`:

```
NODE after_drink
  BARTENDER: @bartender.after_drink
  GOTO start
```

The player sees the bartender's line, then the engine advances to `start` immediately (no click required).

### IF vs CHOICE REQUIRE

**IF blocks** (author-controlled branching):
- Invisible to the player
- First passing condition wins
- Used for conditional story flow based on game state

**CHOICE REQUIRE** (player-facing filtering):
- All passing choices are shown to the player
- Player selects which one to take
- Used for gating options behind requirements (e.g., "needs 50 gold")

```
# IF: player never sees the branching
NODE greeting
  BARTENDER: @bartender.hello

  IF hasFlag metBefore
    GOTO returning_customer
  END

  GOTO new_customer

# CHOICE REQUIRE: player sees all available options
NODE offer
  BARTENDER: @bartender.what_can_i_get_you

  CHOICE @buy_ale
    REQUIRE variableGreaterThan gold 4
    GOTO buy_ale
  END

  CHOICE @buy_wine
    REQUIRE variableGreaterThan gold 10
    GOTO buy_wine
  END

  CHOICE @just_browsing
    GOTO leave
  END
```

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
ADD toParty elisa
REMOVE fromParty elisa
SET relationship bartender 5
ADD relationship bartender 1
SET characterStat elisa level 5
ADD characterStat elisa health -10
SET mapEnabled false
ADVANCE time 2
START dialogue merchant_intro
END dialogue
MUSIC tension_theme.ogg
SOUND door_slam.ogg
VIDEO intro_cinematic.mp4
INTERLUDE chapter_one
ROLL bluffRoll 1 20
NOTIFY @notification.quest_started
```

## Text Syntax

Dialogue text can be written in three forms:

**Plain text**: Just write the words. Works for most lines.

```
BARTENDER: Hello there, traveller!
CHOICE What's the news?
```

**Quoted text**: Wrap in double quotes when the text contains `:`, `#`, or starts with `@`. Quotes are stripped before display.

```
BARTENDER: "Hello, friend! What'll it be?"
CHOICE "Anything starting with @ is safe in quotes"
```

**Localization keys** (prefixed with `@`): Reference a key from a locale file. Required for multi-language support.

```
BARTENDER: @bartender.greeting
CHOICE @bartender.choice.ask_news
```

The `@key` is resolved at snapshot build time against the current locale's data. If the key isn't found, the raw `@key` string is displayed.

For single-language games, plain or quoted text is simpler. Add `@keys` later when you need multiple languages.

## Comments

Lines starting with `#` are ignored:

```
# This is a comment
NODE start
  BARTENDER: @bartender.greeting  # Inline comments work too
```

A `#` inside a quoted string is preserved as text. In plain text, `#` starts a comment and everything after it is ignored — use quotes if you need a literal `#` in dialogue.

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
