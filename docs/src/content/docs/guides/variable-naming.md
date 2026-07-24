---
title: Variable Naming
description: The underscore prefix convention for hidden variables.
---

## Visible vs Hidden Variables

The engine's snapshot describes the current game screen and includes a `variables` field. The default `GameRenderer` displays selected variables in the sidebar's **Resources** panel.

To control which variables are visible, Doodle Engine uses a naming convention:

- **Visible variables**: normal names like `gold`, `reputation`
- **Hidden variables**: underscore-prefixed names like `_drinksBought`, `_timesVisited`

Variable names may contain letters, numbers, and underscores. Validation reports spaces, dashes, and other punctuation as errors.

## The Underscore Convention

Variables starting with `_` are **hidden from the default renderer**. They still exist in game state and can be used in conditions and effects, but they're not shown to the player.

### Example

```yaml
# content/game.yaml
startVariables:
    gold: 100 # Shown to player
    reputation: 0 # Shown to player
    _drinksBought: 0 # Hidden, internal tracking
    _timesVisited: 0 # Hidden, internal tracking
```

### In Dialogue Effects

```text
# Both work the same way in effects
ADD variable gold -5
ADD variable _drinksBought 1
```

### In Conditions

```text
# Both work the same way in conditions
REQUIRE variableGreaterThan gold 4
REQUIRE variableGreaterThan _drinksBought 3
```

## How Filtering Works

The `GameRenderer` filters variables before displaying:

```typescript
const visibleVariables = Object.entries(snapshot.variables).filter(
    ([key]) => !key.startsWith('_')
);
```

The default renderer applies the underscore convention when choosing what to display. The core engine keeps every variable, and a custom renderer can choose its own display rules.

## When to Use Hidden Variables

Use underscore-prefixed variables for:

- **Internal counters**: `_drinksBought`, `_timesVisited`, `_failedAttempts`
- **State tracking**: `_lastDialogueChoice`, `_currentPhase`
- **Condition helpers**: variables only used in `REQUIRE` checks, not meant for player display

Use visible variables for:

- **Resources**: `gold`, `health`, `mana`
- **Reputation/stats**: `reputation`, `karma`, `honor`
- **Story metrics**: anything the player should be aware of
