---
title: Your First Game
description: Explore the example game the scaffolder created for you.
---

The scaffolder created a complete example game. Let's explore what you got.

## game.yaml

Open `content/game.yaml`. This is the game configuration: it sets the starting location, the starting time of day, and the initial values for flags, variables, and inventory.

```yaml
startLocation: tavern
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables:
  gold: 100
  reputation: 0
  _drinksBought: 0
startInventory: []
```

See [YAML Schemas](/reference/yaml-schemas/) for every field this file supports.

## Locations

Open `content/locations/tavern.yaml`. Each location has an `id`, a name, a description, and optional fields for a banner image and music track.

```yaml
id: tavern
name: "@location.tavern.name"
description: "@location.tavern.description"
banner: ""
music: ""
```

The `@key` values are locale references. They resolve to strings in `content/locales/en.yaml`. See [Adding Locations](/guides/adding-locations/) for the full schema and map setup.

## Characters

Open `content/characters/bartender.yaml`. Characters have a name, portrait, a location that places them on the map, and a `dialogue` field pointing to the dialogue file that plays when the player talks to them.

```yaml
id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: ""
location: tavern
dialogue: bartender_greeting
stats: {}
```

See [Characters & Party](/guides/characters-and-party/) for party members, stats, and relationships.

## Dialogues

Open `content/dialogues/bartender_greeting.dlg`. For syntax highlighting in VS Code, install the bundled extension (see [VS Code Extension](/guides/vscode-extension/) for instructions). Dialogues are written in the Doodle DSL. Nodes are conversation points, choices branch the conversation, and effects like `SET flag` or `ADD variable` change game state.

```
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.whats_news
    SET flag metBartender
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE @bartender.choice.nevermind
    GOTO farewell
  END

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
```

The bartender file is well-commented and shows conditions, dice rolls, and quest triggers. See [Writing Dialogues](/guides/writing-dialogues/) for the full DSL reference.

## Quests

Open `content/quests/odd_jobs.yaml`. Quests have a list of stages. Dialogues advance the stage with `SET questStage`, and conditions like `REQUIRE questAtStage` show or hide choices based on where the player is in the quest.

```yaml
id: odd_jobs
name: "@quest.odd_jobs.name"
description: "@quest.odd_jobs.description"
stages:
  - id: started
    description: "@quest.odd_jobs.stage.started"
  - id: talked_to_merchant
    description: "@quest.odd_jobs.stage.talked_to_merchant"
  - id: complete
    description: "@quest.odd_jobs.stage.complete"
```

See [Creating Quests](/guides/creating-quests/) for journal entries and multi-stage quest design.

## The App Component

Open `src/App.tsx`. It fetches the content registry and asset manifest from the dev server, then passes them to `GameShell`. `GameShell` handles everything: splash screen, title screen, loading, pause menu, settings, and the game itself.

See [Game Shell](/guides/game-shell/) for configuration options, or [Custom Renderer](/technical/custom-renderer/) if you want to build your own UI instead.

---

The template files are heavily commented. The best way to learn is to play the game, read the files, change things, and see what happens.

When you're ready to understand a specific feature, the guides explain each piece in detail.
