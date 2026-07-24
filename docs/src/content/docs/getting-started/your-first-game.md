---
title: Your First Game
description: Explore the starter game created by Doodle Engine.
---

Choose **Playable example story** when creating the project used in this guide. It demonstrates the main parts of Doodle Engine.

If you are working in Doodle Studio, begin with the [Studio walkthrough](/studio/). It shows how to explore and change this content in the visual editor.

The walkthrough below uses the command line and a code editor. Start the game with `npm run dev`, open `http://localhost:3000`, and keep the game open while you change its files.

## A Few Terms

You will see these names throughout the guides:

- The **content registry** is the collection of characters, locations, dialogues, quests, and other game definitions loaded from `content/`.
- **Game state** records what has changed during play, including the player's location, flags, variables, inventory, relationships, and quest progress.
- A **snapshot** is the current game state prepared for display. The renderer receives a new snapshot after each player action.
- The **renderer** is the game's interface: the screens, controls, layout, and styles the player sees.
- The **asset manifest** is the list of images, audio, and video the game needs to load.

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

Open `content/locations/tavern.yaml`. Each location has an `id`, a name, a description, and optional fields for a banner image, music, and ambient sound. Text appears directly in the file when you choose the English starter. The localization example uses `@key` references instead.

```yaml
id: tavern
name: 'The Salty Dog'
description: 'A dimly lit tavern smelling of salt and stale ale. Candles flicker on rough wooden tables, and the murmur of conversation fills the air.'
banner: ''
music: ''
ambient: ''
```

See [Adding Locations](/guides/adding-locations/) for the complete location fields and map setup. When you are ready to translate your game, [Localization](/guides/localization/) explains how to replace text with locale keys.

## Characters

Open `content/characters/bartender.yaml`. Characters have a name, portrait, an assigned starting location, and a `dialogue` field pointing to the conversation that begins when the player talks to them.

```yaml
id: bartender
name: 'Marcus the Bartender'
biography: "A gruff man with kind eyes who's heard every story twice. He keeps the peace at The Salty Dog with a firm hand and a generous pour."
portrait: ''
location: tavern
dialogue: bartender_greeting
stats: {}
```

See [Characters & Party](/guides/characters-and-party/) for party members, stats, and relationships.

## Dialogues

Open `content/dialogues/bartender_greeting.dlg`. For syntax highlighting in VS Code, install the bundled extension (see [VS Code Extension](/guides/vscode-extension/) for instructions). Dialogues use Doodle's DSL (domain-specific language), a small scripting format made for conversations. Nodes are conversation points, choices branch the conversation, and effects like `SET flag` or `ADD variable` change game state. This shortened example follows the same structure as the starter dialogue:

```text
NODE start
  BARTENDER: Welcome to the Salty Dog, stranger. What can I get you?

  CHOICE What's the news around here?
    SET flag metBartender
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE Never mind, just passing through.
    GOTO farewell
  END

NODE farewell
  BARTENDER: Take care out there. The streets aren't as safe as they used to be.
  END dialogue

NODE rumors
  BARTENDER: They say someone found an old coin down by the docks.

  CHOICE Thanks for the tip.
    GOTO farewell
  END
```

The bartender dialogue also demonstrates conditions, dice rolls, and quest triggers. See [Writing Dialogues](/guides/writing-dialogues/) for a detailed guide to the dialogue language.

## Quests

Open `content/quests/odd_jobs.yaml`. Quests have a list of stages. Dialogues advance the stage with `SET questStage`. The `questAtStage` condition can make choices available, select an `IF` branch, or control whether a triggered dialogue begins.

```yaml
id: odd_jobs
name: 'Odd Jobs'
description: 'The bartender mentioned someone at the market who could use a hand.'
stages:
    - id: started
      description: 'Marcus mentioned work at the market. I should talk to the merchant there.'
    - id: talked_to_merchant
      description: 'Elena needs a delivery watched. Time to head to the docks.'
    - id: complete
      description: 'Job well done. Elena paid 50 gold for the trouble.'
```

See [Creating Quests](/guides/creating-quests/) for journal entries and multi-stage quest design.

## The App Component

Open `src/App.tsx`. It fetches two resources from the development server: the content registry (the loaded game definitions) and the asset manifest (the media files used by the game). It passes both to `GameShell`, which handles loading, the title and credits screens, gameplay, the pause menu, and settings.

See [Game Shell](/guides/game-shell/) for configuration options, or [Custom Renderer](/technical/custom-renderer/) to build your own UI.

A good way to learn the engine is to experiment with the starter game. Change a line, condition, effect, or starting value, then return to the game to see what changed. The guides explain each feature as you need it.
