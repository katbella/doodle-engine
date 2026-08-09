---
title: Customizing Doodle Engine
description: How to customize Doodle Engine beyond the defaults.
---

Doodle Engine keeps game state separate from presentation. A renderer is the code that turns that state into the interface the player sees. You can restyle the built-in renderer, compose a different interface from Doodle Engine's React components, or build your own renderer. Conditions, effects, and custom save storage provide further ways to shape the game.

This page is an overview of those customization layers, ordered from least to most work. For restyling alone, CSS is enough and [Game Shell styling](/guides/game-shell/#styling) covers it. Detailed renderer and storage implementations live on the pages linked from each option below.

## Choose a Presentation Layer

Start at the first layer that can express the change you want:

1. **Restyle the built-in renderer.** Change CSS custom properties and component classes in `src/renderer-overrides.css`. [Game Shell styling](/guides/game-shell/#styling) documents the four generated themes and the theme-switching command.
2. **Compose Doodle Engine's React components.** Keep the engine and providers, but arrange components such as `DialogueBox`, `ChoiceList`, `MapView`, and `Inventory` in your own layout. The [Custom Renderer guide](/technical/custom-renderer/#mixing-individual-components) shows the complete provider setup, and [React Components](/reference/react-components/) lists every prop.
3. **Build a renderer around the core engine.** `@doodle-engine/core` has no UI dependency, so another React interface, another framework, or plain JavaScript can display its snapshots. [Custom Renderer](/technical/custom-renderer/#building-without-react) owns that implementation path.
4. **Replace the game shell.** Compose your own loading, title, pause, settings, and gameplay flow when the built-in `GameShell` is no longer the right frame. Read [Game Shell](/guides/game-shell/) first so you know which loading, audio, input, save, and video responsibilities the replacement must cover.

All four paths keep the same content and engine rules. The [Architecture overview](/technical/architecture/) explains the action, state, and snapshot flow they share.

## Building Rules With Conditions

Doodle Engine supports the condition types listed in the [Conditions reference](/reference/conditions/). These conditions are evaluated inside the engine for choices, `IF` blocks, triggered dialogues, and triggered interludes.

For game-specific rules, use the existing conditions creatively. Store what matters in flags, variables, inventory, quests, character state, time, or rolls, then check that state later.

```text
SET variable playerClass mage

CHOICE Ask about the old tower.
  REQUIRE variableEquals playerClass mage
  GOTO mage_tower_lore
END
```

In this example, the game records the player's class in a variable. Later, the choice appears only when that variable is `mage`.

## Combining Built-in Effects

Effects are how content records that something happened. Combine them to make larger game actions, then use conditions to check those results later:

```text
# Unlock an ability using flags and variables
SET flag ability_fireball
ADD variable mana_cost_fireball 10
NOTIFY You learned Fireball.

# Shop purchase using variables and items
REQUIRE variableGreaterThan gold 49
ADD variable gold -50
ADD item enchanted_sword
NOTIFY Enchanted sword added to inventory.
```

Combine effects with conditions to model rules and behavior specific to your game.

## Custom Save/Load Backends

The built-in shell stores saves in the browser. A custom renderer can instead send the plain `SaveData` object to a server, IndexedDB, a desktop host, or another storage system. [Save & Load](/guides/save-and-load/#storing-saves-elsewhere) provides the implementation example and documents the permanent project ID that browser save slots require.

When you are ready to go deeper, the Technical section carries on from here: [Architecture](/technical/architecture/) explains the data flow these examples rely on, [Custom Renderer](/technical/custom-renderer/) is the full renderer-building guide, and [Content Registry](/technical/content-registry/) documents the content structures your code receives.
