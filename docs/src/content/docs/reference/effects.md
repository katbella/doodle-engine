---
title: Effects
description: All 27 effect types with examples.
---

Effects are changes to game state. They run in order when a dialogue node is reached or a choice is selected.

## Flags

### SET flag

Set a boolean flag to true.

```text
SET flag metBartender
```

### CLEAR flag

Set a boolean flag to false.

```text
CLEAR flag doorLocked
```

## Variables

### SET variable

Set a variable to a specific value.

```text
SET variable gold 100
SET variable playerName "Aria"
```

### ADD variable

Add to (or subtract from) a numeric variable.

```text
ADD variable gold 50
ADD variable gold -5
```

## Items

### ADD item

Add an item to the player's inventory.

```text
ADD item old_coin
```

### REMOVE item

Remove an item from the game by clearing its location. Afterward, `hasItem`
and `itemAt` both return false for it. Use this when an item is consumed,
destroyed, or handed over permanently.

```text
REMOVE item rusty_key
```

To put an item somewhere instead of removing it, use `MOVE item`.

### MOVE item

Move an item to a specific location.

```text
MOVE item sword armory
```

## Location

### GOTO location

Change the player's current location from within dialogue.

```text
GOTO location market
```

`GOTO nodeId` routes to another dialogue node. `GOTO location` ends the dialogue and moves the player. Map travel through `travelTo()` also calculates travel time and runs location triggers.

## Time

### ADVANCE time

Advance game time by a number of hours.

```text
ADVANCE time 2
```

Time wraps at 24 hours and increments the day counter.

## Quests

### SET questStage

Set a quest to a specific stage.

```text
SET questStage odd_jobs started
SET questStage odd_jobs complete
```

## Journal

### ADD journalEntry

Unlock a journal entry.

```text
ADD journalEntry tavern_discovery
```

Journal entries are only added once. Adding the same entry again has no effect.

## Dialogue Flow

### START dialogue

Replace the current dialogue with a different one, starting from its first node.

```text
START dialogue merchant_intro
```

The current dialogue ends, and the new one begins at its first node. When the new dialogue ends, the player returns to the idle game state.

Use `START dialogue` for a self-contained sequence such as a cutscene, one-off encounter, or quiz.

For a branch that returns to earlier choices, keep its nodes in the same `.dlg` file and route them back with `GOTO`:

```text
# inline: bluff nodes live in bartender_greeting.dlg and GOTO start when done
CHOICE "Try to bluff a free drink."
  GOTO bluff_attempt
END
```

For a standalone dialogue:

```text
# START dialogue: the bluff is a standalone file, conversation ends when it's done
CHOICE "Tell me about yourself."
  START dialogue npc_backstory
END
```

### END dialogue

End the current dialogue and return to the idle state.

```text
END dialogue
```

## Characters

### SET characterLocation

Move a character to a specific location.

```text
SET characterLocation merchant tavern
```

### ADD toParty

Add a character to the player's party.

```text
ADD toParty elisa
```

### REMOVE fromParty

Remove a character from the player's party.

```text
REMOVE fromParty elisa
```

### SET relationship

Set the relationship value with a character (absolute).

```text
SET relationship bartender 5
```

### ADD relationship

Add to (or subtract from) a character's relationship value.

```text
ADD relationship bartender 1
ADD relationship bartender -2
```

### SET characterStat

Set a stat value on a character.

```text
SET characterStat elisa level 5
```

### ADD characterStat

Add to (or subtract from) a character's stat.

```text
ADD characterStat elisa health -10
```

## Map

### SET mapEnabled

Enable or disable the map.

```text
SET mapEnabled true
SET mapEnabled false
```

## Audio

### MUSIC

Change the current music track.

```text
MUSIC tension_theme.ogg
```

Use bare `MUSIC` to clear the override and return to the current location's music.

```text
MUSIC
```

### SOUND

Play a one-shot sound effect.

```text
SOUND door_slam.ogg
```

## Video

### VIDEO

Play a fullscreen video/cutscene. Bare filenames resolve to the normal video asset path.

```text
VIDEO intro_cinematic.mp4
```

The video appears as `pendingVideo` in the snapshot returned by the action. This is a transient field, meaning it lasts for one engine update. `GameShell` keeps the value until `VideoPlayer` finishes; custom renderers need to retain it for playback as well.

## Interludes

### INTERLUDE

Show a narrative interlude: a full-screen text scene with scrolling text and a background image, like chapter cards in Infinity Engine games such as Baldur's Gate.

```text
INTERLUDE chapter_one
```

The interlude ID must match an ID in `content/interludes/`. The interlude appears as `pendingInterlude` in the snapshot returned by the action. Renderers dismiss it with `dismissInterlude()`. See the [Interludes guide](/guides/interludes/) for the full YAML schema.

## Dice Rolling

### ROLL

Roll a random integer between `min` and `max` (inclusive) and store the result in a variable.

```text
ROLL bluffRoll 1 20
```

| Argument   | Type     | Description                          |
| ---------- | -------- | ------------------------------------ |
| `variable` | `string` | Variable name to store the result in |
| `min`      | `number` | Minimum value (inclusive)            |
| `max`      | `number` | Maximum value (inclusive)            |

The stored variable can then be displayed in dialogue using `{varName}` interpolation, or tested with `variableGreaterThan` / `variableLessThan` conditions.

```text
# Roll once, then branch and display the result
ROLL bluffRoll 1 20
NARRATOR: You rolled a {bluffRoll}.

IF variableGreaterThan bluffRoll 14
  SET flag bluffedMarcus
  ADD relationship bartender 2
  GOTO success
END

GOTO failure
```

Effects inside an `IF` block run only when that IF condition passes. If the IF block has a `GOTO`, the engine applies those effects before moving to the target node.

For a hidden check where you don't need the value, use the `roll` condition in an `IF` block or triggered content:

```text
IF roll 1 20 15
  GOTO lucky_find
END
```

See the [Dice & Randomness guide](/guides/dice-and-randomness/) for patterns and examples.

## Notifications

### NOTIFY

Show a notification to the player. Supports `@key` localization.

```text
NOTIFY @notification.quest_started
NOTIFY "You found something!"
```

Notifications are transient: they appear in one snapshot and then clear.

## TypeScript API

```typescript
import { applyEffect, applyEffects } from '@doodle-engine/core';

// Single effect
const newState = applyEffect(effect, gameState);

// Multiple effects (applied sequentially)
const newState = applyEffects(effects, gameState);
```

## Effect Order

Effects within a node or choice are applied sequentially, top to bottom. This means later effects can depend on earlier ones:

```text
SET flag questStarted
SET questStage odd_jobs started
ADD journalEntry odd_jobs_accepted
NOTIFY @notification.quest_started
```

The flag is set before the quest stage changes, and the notification fires last.
