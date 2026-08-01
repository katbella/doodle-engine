---
title: Flags & Variables
description: The two kinds of global game state, how to name them, and which ones the player sees.
---

Flags and variables are the memory of your game. A **flag** is a named on/off value: it records that something happened, like `metBartender` or `seenTavernIntro`. A **variable** holds a number or a piece of text, like `gold: 100` or `reputation: 0`. Both are global, both live in game state, and both are written by effects and read by conditions.

Pick a flag when the question is "did this happen?" and a variable when the question is "how much?" or "which one?". This page covers working with them in dialogue files and `game.yaml`; Studio's [Flags & Variables page](/studio/flags-and-variables/) tracks the same names visually across a whole project.

## Setting and Checking Flags

```text
SET flag metBartender
CLEAR flag doorLocked

CHOICE Ask about the back room.
  REQUIRE hasFlag metBartender
  GOTO back_room
END
```

`hasFlag` passes when the flag is set, and `notFlag` passes when it is not, which also covers flags that were never set at all. That makes `notFlag` plus a matching `SET flag` the standard pattern for anything that should happen once, like a location introduction.

## Setting and Checking Variables

```text
SET variable gold 100
ADD variable gold -5

CHOICE Buy a drink for five gold.
  REQUIRE variableGreaterThan gold 4
  GOTO buy_drink
END
```

`variableEquals`, `variableGreaterThan`, and `variableLessThan` compare against a value; the greater and less checks are strict, so the threshold itself does not pass. A variable can also appear inside displayed text as `{gold}`; [Dice & Randomness](/guides/dice-and-randomness/#text-interpolation) covers interpolation.

Starting values for both come from `content/game.yaml`:

```yaml
startFlags: {}
startVariables:
    gold: 100
    reputation: 0
    _drinksBought: 0
```

## Naming Rules

Flag and variable names may contain letters, numbers, and underscores. Validation reports spaces, dashes, and other punctuation as errors. Beyond the rules, a consistent scheme pays off: names that share a prefix, such as `miller_started` and `miller_reputation`, group together in Studio and stay readable in a large project.

## Visible vs Hidden Variables

The engine's snapshot describes the current game screen and includes a `variables` field. The default `GameRenderer` displays variables in the sidebar's **Resources** panel, and one naming convention controls which ones appear: a variable whose name starts with `_` is hidden from the player. It still exists in game state and works everywhere in conditions and effects.

```text
# Both work the same way in effects and conditions
ADD variable gold -5
ADD variable _drinksBought 1
REQUIRE variableGreaterThan _drinksBought 3
```

The filtering happens in the renderer, not the engine:

```typescript
const visibleVariables = Object.entries(snapshot.variables).filter(
    ([key]) => !key.startsWith('_')
);
```

The core engine keeps every variable, and a custom renderer can choose its own display rules.

Hide anything that is bookkeeping rather than information the player should watch. Internal counters like `_drinksBought` or `_timesVisited`, phase trackers like `_currentPhase`, and variables that only exist to feed `REQUIRE` checks all belong behind the underscore.

Keep a variable visible when the player should be aware of it and watch it change: resources like `gold` or `health`, standing like `reputation` or `karma`, and any story metric the game wants the player thinking about. The starter project follows this split with visible `gold` and `reputation` beside hidden `_drinksBought`.

Flags are never shown to the player by the built-in renderer, so they need no such convention. The same underscore prefix does hide character stats from the built-in character sheet; see [Character Stats](/guides/characters-and-party/#character-stats).

## Keeping Track at Scale

Nothing declares a flag or variable ahead of time; the first `SET` brings it into being. That is convenient and also how typos become bugs: `metBartender` set in one file and `metBartneder` checked in another simply never match. Studio's [Flags & Variables page](/studio/flags-and-variables/) exists for exactly this, with checks for names that are set but never read, read but never set, or nearly identical, plus notes that travel with the project. From the files side, `npm run validate` confirms the names are well-formed, and Studio's playtester shows every flag and variable live while you test a branch.
