---
title: Dice & Randomness
description: Add skill checks, random outcomes, and variable interpolation to your dialogues.
---

Doodle Engine has two ways to roll dice: the `ROLL` effect and the `roll` condition. Both roll a random integer between `min` and `max` (inclusive).

## ROLL effect

`ROLL <variable> <min> <max>`: rolls a random integer and stores it in a variable. Use this when you need to:

- Display the result to the player
- Branch on the result in multiple places
- Reference the roll value later in the scene

```text
ROLL bluffRoll 1 20
NARRATOR: You rolled a {bluffRoll}!
```

When the dialogue appears, the `{bluffRoll}` placeholder is replaced with the variable's value. Placeholders work in speaker lines, narrator lines, choices, and notifications.

## roll condition

`roll <min> <max> <threshold>` rolls a random integer and returns true when the result is greater than or equal to the threshold. It returns only true or false, making it useful for hidden checks in `IF` blocks or triggered content.

```text
IF roll 1 20 15
  GOTO lucky_find
END
```

To make a choice roll dice when the player clicks it, send the choice to a node that rolls with `ROLL` and branches with `IF`. One roll can lead to several different responses:

```text
CHOICE Try to charm the guard
  GOTO charm_roll
END

NODE charm_roll
  ROLL charm 1 20
  IF variableGreaterThan charm 17
    GOTO charm_amazing
  END
  IF variableGreaterThan charm 12
    GOTO charm_good
  END
  IF variableGreaterThan charm 7
    GOTO charm_weak
  END
  GOTO charm_fail
```

The engine checks the `IF` blocks from top to bottom and uses the first matching branch. A roll of 19 goes to `charm_amazing`, 14 to `charm_good`, 9 to `charm_weak`, and 3 to `charm_fail`.

## Skill check pattern

The most common pattern: roll once with the `ROLL` effect, show the result, then branch:

```text
NODE skill_check
  # Roll first, before any dialogue
  ROLL bluffRoll 1 20
  NARRATOR: You consider spinning Marcus a tale to get a free drink.

  CHOICE Try the story.
    GOTO resolve
  END

  CHOICE Back down.
    END dialogue
  END

NODE resolve
  NARRATOR: You spin the tale, rolling a {bluffRoll}.

  IF variableGreaterThan bluffRoll 14
    ADD relationship bartender 2
    SET flag bluffedMarcus
    GOTO success
  END

  GOTO failure

NODE success
  NARRATOR: The story lands perfectly. Marcus slides over a free drink.
  END dialogue

NODE failure
  NARRATOR: Marcus raises an eyebrow. Nice try.
  END dialogue
```

## Hidden check pattern

For a check the player doesn't see, such as a random encounter or lucky find, use the `roll` condition in an `IF` block:

```text
NODE explore
  NARRATOR: You search beneath the loose floorboards.

  # 25% chance of finding the coin (roll 1-4, need 4+)
  IF roll 1 4 4
    ADD item old_coin
    NOTIFY Old coin added to inventory.
  END

  GOTO continue
```

Effects inside an `IF` block run only when that condition passes. In the hidden check above, the coin and notification are only awarded on the successful roll.

## Threshold reference

| Dice      | Threshold        | Chance |
| --------- | ---------------- | ------ |
| `1 20 15` | 15+ on a d20     | 30%    |
| `1 20 11` | 11+ on a d20     | 50%    |
| `1 20 6`  | 6+ on a d20      | 75%    |
| `1 4 4`   | 4 on a d4        | 25%    |
| `1 2 2`   | 2 on a coin flip | 50%    |

## Variable interpolation

`{varName}` works anywhere in dialogue text, not just with rolls. Any variable in `state.variables` can be interpolated:

```text
# Show current gold
BARTENDER: "You've got {gold} gold on you. Enough for a drink?"

# Show quest progress
NARRATOR: "Reputation: {reputation}."
```

If the variable doesn't exist, the placeholder is left as-is (`{gold}`).
