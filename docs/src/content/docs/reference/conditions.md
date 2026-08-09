---
title: Conditions
description: All 18 condition types with examples.
---

Conditions are tests against game state that return true or false. They're used in dialogue choices (`REQUIRE`), conditional branches (`IF`), triggered dialogues, and triggered interludes.

Multiple conditions on the same element use AND logic: all must pass.

## hasFlag

Check if a flag is set to true.

```text
REQUIRE hasFlag metBartender
```

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `flag`    | `string` | Flag key to check |

## notFlag

Check if a flag is not set (false or undefined).

```text
REQUIRE notFlag doorLocked
```

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `flag`    | `string` | Flag key to check |

## hasItem

Check if an item is in the player's inventory.

```text
REQUIRE hasItem rusty_key
```

| Parameter | Type     | Description          |
| --------- | -------- | -------------------- |
| `itemId`  | `string` | Item ID to check for |

## variableEquals

Check if a variable equals a specific value.

```text
REQUIRE variableEquals gold 100
REQUIRE variableEquals playerName Aria
```

| Parameter  | Type               | Description              |
| ---------- | ------------------ | ------------------------ |
| `variable` | `string`           | Variable key             |
| `value`    | `number \| string` | Value to compare against |

## variableGreaterThan

Check if a numeric variable is greater than a value (strict).

```text
REQUIRE variableGreaterThan gold 4
```

| Parameter  | Type     | Description           |
| ---------- | -------- | --------------------- |
| `variable` | `string` | Variable key          |
| `value`    | `number` | Threshold (exclusive) |

## variableLessThan

Check if a numeric variable is less than a value (strict).

```text
REQUIRE variableLessThan reputation 0
```

| Parameter  | Type     | Description           |
| ---------- | -------- | --------------------- |
| `variable` | `string` | Variable key          |
| `value`    | `number` | Threshold (exclusive) |

## characterStatEquals

Check whether a character stat exactly equals a number or string. Use the
reserved character ID `player` for the player character.

```text
REQUIRE characterStatEquals player class @class.ranger
REQUIRE characterStatEquals elisa level 5
```

| Parameter     | Type               | Description              |
| ------------- | ------------------ | ------------------------ |
| `characterId` | `string`           | Character ID or `player` |
| `stat`        | `string`           | Stable stat key          |
| `value`       | `number \| string` | Value to compare against |

Numbers only equal numbers and strings only equal strings. The engine does not
convert between them.

## characterStatGreaterThan

Check whether a numeric character stat is strictly greater than a number.

```text
REQUIRE characterStatGreaterThan player strength 16.1
```

| Parameter     | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `characterId` | `string` | Character ID or `player` |
| `stat`        | `string` | Stable stat key          |
| `value`       | `number` | Threshold (exclusive)    |

This condition returns false when the stat is missing or is a string.

## characterStatLessThan

Check whether a numeric character stat is strictly less than a number.

```text
REQUIRE characterStatLessThan elisa strength 18
```

| Parameter     | Type     | Description              |
| ------------- | -------- | ------------------------ |
| `characterId` | `string` | Character ID or `player` |
| `stat`        | `string` | Stable stat key          |
| `value`       | `number` | Threshold (exclusive)    |

This condition returns false when the stat is missing or is a string.

## atLocation

Check if the player is at a specific location.

```text
REQUIRE atLocation tavern
```

| Parameter    | Type     | Description |
| ------------ | -------- | ----------- |
| `locationId` | `string` | Location ID |

## questAtStage

Check if a quest is at a specific stage.

```text
REQUIRE questAtStage odd_jobs started
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `questId` | `string` | Quest ID              |
| `stageId` | `string` | Stage ID to check for |

A quest that hasn't been started has no stage, so `questAtStage` will return false.

Use `questAtStage` for a specific progression step. Use `questStatus` for whether a quest has started, is underway, or has finished.

## questStatus

Check whether a quest has not started, is active, or is complete.

```text
REQUIRE questStatus odd_jobs active
```

| Parameter | Type                                | Description     |
| --------- | ----------------------------------- | --------------- |
| `questId` | `string`                            | Quest ID        |
| `status`  | `not_started \| active \| complete` | Status to check |

## characterAt

Check if a character is at a specific location.

```text
REQUIRE characterAt merchant market
```

| Parameter     | Type     | Description  |
| ------------- | -------- | ------------ |
| `characterId` | `string` | Character ID |
| `locationId`  | `string` | Location ID  |

## characterInParty

Check if a character is in the player's party.

```text
REQUIRE characterInParty elisa
```

| Parameter     | Type     | Description  |
| ------------- | -------- | ------------ |
| `characterId` | `string` | Character ID |

## relationshipAbove

Check if relationship with a character is above a value (strict greater than).

```text
REQUIRE relationshipAbove bartender 5
```

| Parameter     | Type     | Description               |
| ------------- | -------- | ------------------------- |
| `characterId` | `string` | Character ID              |
| `value`       | `number` | Minimum value (exclusive) |

## relationshipBelow

Check if relationship with a character is below a value (strict less than).

```text
REQUIRE relationshipBelow bartender 0
```

| Parameter     | Type     | Description               |
| ------------- | -------- | ------------------------- |
| `characterId` | `string` | Character ID              |
| `value`       | `number` | Maximum value (exclusive) |

## timeIs

Check if current time is within a range (24-hour format). Handles wrap-around (e.g., 20 to 6 means 8 PM to 6 AM).

```text
REQUIRE timeIs 20 6
```

| Parameter   | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `startHour` | `number` | Start hour (0-23, inclusive) |
| `endHour`   | `number` | End hour (0-23, exclusive)   |

## itemAt

Check whether an item is at a specific location. `REMOVE item` clears the
item's location, so `itemAt` returns false for every location, including
`inventory`.

```text
REQUIRE itemAt sword armory
```

| Parameter    | Type     | Description |
| ------------ | -------- | ----------- |
| `itemId`     | `string` | Item ID     |
| `locationId` | `string` | Location ID |

## roll

Roll a random whole number between `min` and `max` (inclusive) and return true if the result is greater than or equal to `threshold`. This condition returns only true or false. The `ROLL` effect stores the result in a variable.

```text
IF roll 1 20 15
  GOTO lucky_find
END
```

| Field       | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `min`       | `number` | Minimum roll value (inclusive) |
| `max`       | `number` | Maximum roll value (inclusive) |
| `threshold` | `number` | Minimum result needed to pass  |

`min` and `max` must be whole numbers, and `min` cannot be greater than `max`.

**Use `ROLL` effect first when you need to:**

- Show the player what they rolled (variable interpolation with `{varName}`)
- Branch on the result in multiple places
- Reference the roll elsewhere in the scene

Use `roll` for a hidden check in an `IF` block or triggered content. To roll when the player picks a choice, route that choice to a node that uses `ROLL` and `IF`. See the [Dice & Randomness guide](/guides/dice-and-randomness/).

## Using Conditions in Dialogue

### On choices (shown only when condition passes):

```text
CHOICE @buy_drink
  REQUIRE variableGreaterThan gold 4
  GOTO drink
END
```

### On conditional branches:

```text
IF questAtStage odd_jobs started
  SET flag sawQuestUpdate
  GOTO quest_update
END
```

Effects inside an `IF` block run only if that IF condition passes. If multiple IF blocks pass, only the first passing block runs.

### On triggered dialogues (top-level):

```text
TRIGGER tavern
REQUIRE notFlag seenIntro
```

### Multiple conditions (AND logic):

```text
CHOICE @secret_option
  REQUIRE hasFlag metBartender
  REQUIRE relationshipAbove bartender 5
  REQUIRE hasItem old_coin
  GOTO secret
END
```

## TypeScript API

```typescript
import { evaluateCondition, evaluateConditions } from '@doodle-engine/core';

// Single condition
const passes = evaluateCondition(condition, gameState);

// Multiple conditions (AND logic)
const allPass = evaluateConditions(conditions, gameState);
```
