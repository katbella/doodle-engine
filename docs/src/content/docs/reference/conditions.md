---
title: Conditions
description: All 14 condition types with examples.
---

Conditions are tests against game state that return true or false. They're used in dialogue choices (`REQUIRE`), conditional branches (`IF`), triggered dialogues, and node visibility.

Multiple conditions on the same element use AND logic: all must pass.

## hasFlag

Check if a flag is set to true.

```
REQUIRE hasFlag metBartender
```

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `flag`    | `string` | Flag key to check |

## notFlag

Check if a flag is not set (false or undefined).

```
REQUIRE notFlag doorLocked
```

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `flag`    | `string` | Flag key to check |

## hasItem

Check if an item is in the player's inventory.

```
REQUIRE hasItem rusty_key
```

| Parameter | Type     | Description          |
| --------- | -------- | -------------------- |
| `itemId`  | `string` | Item ID to check for |

## variableEquals

Check if a variable equals a specific value.

```
REQUIRE variableEquals gold 100
REQUIRE variableEquals playerName "Aria"
```

| Parameter  | Type               | Description              |
| ---------- | ------------------ | ------------------------ |
| `variable` | `string`           | Variable key             |
| `value`    | `number \| string` | Value to compare against |

## variableGreaterThan

Check if a numeric variable is greater than a value (strict).

```
REQUIRE variableGreaterThan gold 4
```

| Parameter  | Type     | Description           |
| ---------- | -------- | --------------------- |
| `variable` | `string` | Variable key          |
| `value`    | `number` | Threshold (exclusive) |

## variableLessThan

Check if a numeric variable is less than a value (strict).

```
REQUIRE variableLessThan reputation 0
```

| Parameter  | Type     | Description           |
| ---------- | -------- | --------------------- |
| `variable` | `string` | Variable key          |
| `value`    | `number` | Threshold (exclusive) |

## atLocation

Check if the player is at a specific location.

```
REQUIRE atLocation tavern
```

| Parameter    | Type     | Description |
| ------------ | -------- | ----------- |
| `locationId` | `string` | Location ID |

## questAtStage

Check if a quest is at a specific stage.

```
REQUIRE questAtStage odd_jobs started
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `questId` | `string` | Quest ID              |
| `stageId` | `string` | Stage ID to check for |

A quest that hasn't been started has no stage, so `questAtStage` will return false.

## characterAt

Check if a character is at a specific location.

```
REQUIRE characterAt merchant market
```

| Parameter     | Type     | Description  |
| ------------- | -------- | ------------ |
| `characterId` | `string` | Character ID |
| `locationId`  | `string` | Location ID  |

## characterInParty

Check if a character is in the player's party.

```
REQUIRE characterInParty elisa
```

| Parameter     | Type     | Description  |
| ------------- | -------- | ------------ |
| `characterId` | `string` | Character ID |

## relationshipAbove

Check if relationship with a character is above a value (strict greater than).

```
REQUIRE relationshipAbove bartender 5
```

| Parameter     | Type     | Description               |
| ------------- | -------- | ------------------------- |
| `characterId` | `string` | Character ID              |
| `value`       | `number` | Minimum value (exclusive) |

## relationshipBelow

Check if relationship with a character is below a value (strict less than).

```
REQUIRE relationshipBelow bartender 0
```

| Parameter     | Type     | Description               |
| ------------- | -------- | ------------------------- |
| `characterId` | `string` | Character ID              |
| `value`       | `number` | Maximum value (exclusive) |

## timeIs

Check if current time is within a range (24-hour format). Handles wrap-around (e.g., 20 to 6 means 8 PM to 6 AM).

```
REQUIRE timeIs 20 6
```

| Parameter   | Type     | Description                  |
| ----------- | -------- | ---------------------------- |
| `startHour` | `number` | Start hour (0-23, inclusive) |
| `endHour`   | `number` | End hour (0-23, exclusive)   |

## itemAt

Check if an item is at a specific location.

```
REQUIRE itemAt sword armory
```

| Parameter    | Type     | Description |
| ------------ | -------- | ----------- |
| `itemId`     | `string` | Item ID     |
| `locationId` | `string` | Location ID |

## roll

Roll a random integer between `min` and `max` (inclusive) and return true if the result is greater than or equal to `threshold`. The roll is not stored anywhere — use the `ROLL` effect if you need the value.

```
REQUIRE roll 1 20 15
```

| Field       | Type     | Description                    |
| ----------- | -------- | ------------------------------ |
| `min`       | `number` | Minimum roll value (inclusive) |
| `max`       | `number` | Maximum roll value (inclusive) |
| `threshold` | `number` | Minimum result needed to pass  |

**Use `ROLL` effect first when you need to:**

- Show the player what they rolled (variable interpolation with `{varName}`)
- Branch on the result in multiple places
- Reference the roll elsewhere in the scene

For a one-shot hidden check with no displayed result, the `roll` condition is simpler. See the [Dice & Randomness guide](/guides/dice-and-randomness/).

## Using Conditions in Dialogue

### On choices (shown only when condition passes):

```
CHOICE @buy_drink
  REQUIRE variableGreaterThan gold 4
  GOTO drink
END
```

### On conditional branches:

```
IF questAtStage odd_jobs started
  GOTO quest_update
END
```

### On triggered dialogues (top-level):

```
TRIGGER tavern
REQUIRE notFlag seenIntro
```

### Multiple conditions (AND logic):

```
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
