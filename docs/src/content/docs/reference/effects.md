---
title: Effects
description: All 25 effect types with examples.
---

Effects are mutations to game state. They run in order when a dialogue node is reached or a choice is selected.

## Flags

### SET flag

Set a boolean flag to true.

```
SET flag metBartender
```

### CLEAR flag

Set a boolean flag to false.

```
CLEAR flag doorLocked
```

## Variables

### SET variable

Set a variable to a specific value.

```
SET variable gold 100
SET variable playerName "Aria"
```

### ADD variable

Add to (or subtract from) a numeric variable.

```
ADD variable gold 50
ADD variable gold -5
```

## Items

### ADD item

Add an item to the player's inventory.

```
ADD item old_coin
```

### REMOVE item

Remove an item from the player's inventory.

```
REMOVE item rusty_key
```

### MOVE item

Move an item to a specific location.

```
MOVE item sword armory
```

## Location

### GOTO location

Change the player's current location (from within dialogue).

```
GOTO location market
```

Note: This is different from `GOTO nodeId` which routes to another dialogue node. `GOTO location` is an effect that ends the dialogue and moves the player.

## Time

### ADVANCE time

Advance game time by a number of hours.

```
ADVANCE time 2
```

Time wraps at 24 hours and increments the day counter.

## Quests

### SET questStage

Set a quest to a specific stage.

```
SET questStage odd_jobs started
SET questStage odd_jobs complete
```

## Journal

### ADD journalEntry

Unlock a journal entry.

```
ADD journalEntry tavern_discovery
```

Journal entries are only added once. Adding the same entry again has no effect.

## Dialogue Flow

### START dialogue

Start a different dialogue.

```
START dialogue merchant_intro
```

### END dialogue

End the current dialogue and return to the idle state.

```
END dialogue
```

## Characters

### SET characterLocation

Move a character to a specific location.

```
SET characterLocation merchant tavern
```

### ADD toParty

Add a character to the player's party.

```
ADD toParty jaheira
```

### REMOVE fromParty

Remove a character from the player's party.

```
REMOVE fromParty jaheira
```

### SET relationship

Set the relationship value with a character (absolute).

```
SET relationship bartender 5
```

### ADD relationship

Add to (or subtract from) a character's relationship value.

```
ADD relationship bartender 1
ADD relationship bartender -2
```

### SET characterStat

Set a stat value on a character.

```
SET characterStat jaheira level 5
```

### ADD characterStat

Add to (or subtract from) a character's stat.

```
ADD characterStat jaheira health -10
```

## Map

### SET mapEnabled

Enable or disable the map.

```
SET mapEnabled true
SET mapEnabled false
```

## Audio

### MUSIC

Change the current music track.

```
MUSIC tension_theme.ogg
```

### SOUND

Play a one-shot sound effect.

```
SOUND door_slam.ogg
```

## Video

### VIDEO

Play a fullscreen video/cutscene. The video file path is relative to the video base path.

```
VIDEO intro_cinematic.mp4
```

The video appears as `pendingVideo` in the snapshot. It's transient: it appears in one snapshot and is automatically cleared. The `VideoPlayer` component (or `GameShell`) handles playback and skip.

## Interludes

### INTERLUDE

Show a narrative interlude — a full-screen text scene with scrolling text and a background image, like chapter cards in Baldur's Gate.

```
INTERLUDE chapter_one
```

The interlude ID must match an entity in `content/interludes/`. The interlude appears as `pendingInterlude` in the snapshot. It's transient: it appears in one snapshot and is automatically cleared after the player dismisses it. See the [Interludes guide](/doodle-engine/guides/interludes/) for the full YAML schema.

## Notifications

### NOTIFY

Show a notification to the player. Supports `@key` localization.

```
NOTIFY @notification.quest_started
NOTIFY "You found something!"
```

Notifications are transient. They appear in one snapshot and are automatically cleared.

## TypeScript API

```typescript
import { applyEffect, applyEffects } from '@doodle-engine/core'

// Single effect
const newState = applyEffect(effect, gameState)

// Multiple effects (applied sequentially)
const newState = applyEffects(effects, gameState)
```

## Effect Order

Effects within a node or choice are applied sequentially, top to bottom. This means later effects can depend on earlier ones:

```
SET flag questStarted
SET questStage odd_jobs started
ADD journalEntry odd_jobs_accepted
NOTIFY @notification.quest_started
```

The flag is set before the quest stage changes, and the notification fires last.
