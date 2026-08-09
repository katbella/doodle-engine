---
title: Your First Game
description: Create the starter game and learn how a Doodle Engine project works.
---

This tutorial creates a small playable game, then follows one conversation through the project so you can see how its parts fit together. The explanations apply whether you use Doodle Studio or work with the CLI and a separate text editor. Where the actions differ, both sets of instructions are provided.

Complete [Installation](/getting-started/installation/) before you begin. You only need to install the tools for the way you want to work today.

## Create the starter project

### In Doodle Studio

1. Launch Doodle Studio and select **New project…**.
2. Enter a project name and game title, then choose where to create the project.
3. Keep **Playable example story** selected and choose **English text with a locale starter file**.
4. Keep the default React renderer and starter styles selected, then select **Create**.
5. When the dependency banner appears, select **Install dependencies** and wait for it to finish.

### From the command line

Open a terminal and create the project:

```bash
npx doodle-engine create my-game
```

Choose **Playable example story** and **English text with a locale starter file** when the command asks. Keep the default React renderer and starter styles, then install the project dependencies:

```bash
cd my-game
npm install
```

The command-line workflow pairs terminal commands with a separate text editor. Source mode remains part of Doodle Studio.

## A few terms

You will see these names throughout the documentation:

- The **content registry** is the collection of characters, locations, dialogues, quests, and other game definitions loaded from `content/`.
- **Game state** records what has changed during play, including the player's location, flags, variables, inventory, relationships, and quest progress.
- A **snapshot** is the current game state prepared for display. The renderer receives a new snapshot after each player action.
- The **renderer** is the game's interface: the screens, controls, layout, and styles the player sees.
- The **asset manifest** lists the images, audio, and video the game needs to load.

The [Glossary](/reference/glossary/) collects these and the rest of the Doodle Engine vocabulary in one place.

## How the project fits together

The starter story begins in a tavern called The Salty Dog. The tavern has an ID, and the bartender's file uses that ID to place him there. His file points to a dialogue, and that dialogue can start a quest or change facts that later conversations will remember. These links let the story grow across several files without putting everything in one script.

When the game starts, Doodle Engine loads the files under `content/` into the content registry. Each definition has an ID so that other parts of the project can refer to it. In Doodle Studio, Visual mode presents fields for these files and Source mode opens their text. The command-line workflow uses a separate editor for the same files.

During the conversation, conditions read game state and effects update it. After each action, the renderer receives a new snapshot and updates the interface on screen.

## Run the starter game

In Doodle Studio, select **Preview** in the top bar. Doodle Studio starts the project's local server and opens the game in your browser.

From the command line, run:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser. Leave the server running while you explore and edit the project.

Start a new game and speak to Marcus in The Salty Dog. You will return to this conversation after looking at the content behind it.

## Start with the game configuration

In Doodle Studio, select **Game Config** in the project rail. In a text editor, open `content/game.yaml`.

This file sets the state at the beginning of a new game. The starter project begins in the tavern on the first morning, with 100 gold and no inventory:

```yaml
author: ""
playerCreatesProfile: true
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

Fill in `author` to show an author or studio name above the title when the title
screen has no logo. `playerCreatesProfile: true` tells the built-in renderer to
ask for the player's name before the story begins. The other values become the
first game state. Effects in dialogue can change them later.

## Follow the tavern to its character

In Doodle Studio, open `tavern` under **Locations**. In a text editor, open `content/locations/tavern.yaml`.

The location has a stable `id` used by the rest of the project. Its name and description are the words shown to the player:

```yaml
id: tavern
name: "The Salty Dog"
description: "A dimly lit tavern smelling of salt and stale ale. Candles flicker on rough wooden tables, and the murmur of conversation fills the air."
banner: ""
music: ""
ambient: ""
```

Now open `bartender` under **Characters**, or open `content/characters/bartender.yaml` in a text editor:

```yaml
id: bartender
name: "Marcus the Bartender"
title: ""
biography: "A gruff man with kind eyes who's heard every story twice. He keeps the peace at The Salty Dog with a firm hand and a generous pour."
portrait: ""
location: tavern
dialogue: bartender_greeting
stats: {}
```

The `location` field places Marcus in the tavern by referring to its ID. The `dialogue` field names the conversation that begins when the player talks to him. Display names can change without breaking either connection because the project uses IDs for these references.

## See how dialogue changes the game

In Doodle Studio, open `bartender_greeting` under **Dialogues**. Visual mode shows one node at a time, and Source mode shows the `.dlg` file. In a text editor, open `content/dialogues/bartender_greeting.dlg`.

Dialogue files use a small scripting format called the Doodle Engine DSL. A node holds a point in the conversation. Choices lead to another node, and effects record what happened. This shortened example follows the same structure as the starter dialogue:

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

Choosing the first response sets the `metBartender` flag and raises Marcus's relationship value before moving to the `rumors` node. Those changes become part of game state. A later condition can read them and reveal a choice or take a different branch.

## Follow the quest connection

The full bartender dialogue can start the Odd Jobs quest. Open `odd_jobs` under **Quests** in Doodle Studio, or open `content/quests/odd_jobs.yaml` in a text editor:

```yaml
id: odd_jobs
name: "Odd Jobs"
description: "The bartender mentioned someone at the market who could use a hand."
stages:
    - id: started
      description: "Marcus mentioned work at the market. I should talk to the merchant there."
    - id: talked_to_merchant
      description: "Elena needs a delivery watched. Time to head to the docks."
    - id: complete
      description: "Job well done. Elena paid 50 gold for the trouble."
```

The quest has its own ID, and each stage has an ID within that quest. Dialogue effects move the quest from one stage to another. Conditions can then check the current stage before showing a response or starting another conversation.

## Make a change

Return to the `start` node in `bartender_greeting` and change Marcus's opening line.

In Doodle Studio, make the change in Visual mode and wait for the save indicator to clear. Select **Playtest**, choose **Start at node…**, and select the `start` node in `bartender_greeting`. The playtester begins at the edited line and lets you follow the choices without restarting the full game.

In a text editor, save the `.dlg` file while the development server is running. The terminal reports `Content changed` and the browser reloads. Speak to Marcus again to see the new line.

This editing loop stays the same as the project grows. Change the content, test the part of the story affected by it, and check the result in the game.

## What displays the game

The files under `src/` make up the application that runs in the browser. `src/App.tsx` loads the content registry and the asset manifest, which tells the application where to find the project's media. It passes both to `GameShell`, the built-in renderer used by the starter project.

You can write the story without changing these application files. They become relevant when you want to restyle the interface, change how a screen behaves, or build a renderer of your own.

## Continue from here

[Project Structure](/getting-started/project-structure/) explains the remaining folders and files now that you have seen the main connections in a working game. After that, [Doodle Studio](/studio/) continues with the desktop editor, while [Writing Dialogues](/guides/writing-dialogues/) continues with the dialogue language in a text editor.
