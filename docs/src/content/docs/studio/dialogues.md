---
title: Dialogue Editing in Studio
description: Create dialogue files, arrange nodes, author choices, and add conditions and effects.
---

The dialogue editor provides a visual way to build each conversation and connect its paths.

[![Editing a dialogue in Doodle Studio](/images/studio/dialogue-editor.png)](/images/studio/dialogue-editor.png)

## Create a dialogue

Select the **+** beside Dialogues, or select **New content…** and choose Dialogue. Enter an ID such as `bartender_greeting`. IDs may contain letters, numbers, and underscores. Lowercase words separated by underscores are recommended for consistency, but uppercase letters are also accepted. Studio creates `content/dialogues/bartender_greeting.dlg`.

The dialogue opens with a starting node. A node is one moment in the conversation: a line, the choices following it, and any state changes that happen there.

## Edit a node

Open `bartender_greeting` and select its `start` node. Begin by changing the speaker’s line. Type it exactly as the player should read it.

Each node can contain:

- Node ID
- The character speaking, or Narrator for narration
- The line shown to the player
- Voice asset
- Optional portrait override for an expression or alternate image used on this node
- Choices
- Conditions and effects
- The next node or dialogue ending

[![The node list and selected starting node](/images/studio/dialogue-nodes.png)](/images/studio/dialogue-nodes.png)

[![Speaker, line, voice, and portrait controls for a node](/images/studio/dialogue-node-fields.png)](/images/studio/dialogue-node-fields.png)

## Add choices

Each choice has the words shown to the player and the place the conversation goes next. Choices appear in the listed order; use the up and down controls to rearrange them. Point a choice at another node, or choose **end dialogue** when it should close the conversation.

[![Editing a dialogue choice and its route](/images/studio/dialogue-choice.png)](/images/studio/dialogue-choice.png)

When a node has a final line and no choices, the player sees **End Dialogue** instead of **Continue**.

## Add conditions

Conditions decide whether a choice, trigger, or branch is available. Open the condition builder, search for a condition, and fill in its arguments.

[![Adding a requirement with the condition builder](/images/studio/condition-builder.png)](/images/studio/condition-builder.png)

Common examples:

- `hasFlag` reveals content after a story event.
- `hasItem` checks inventory.
- `questAtStage` connects dialogue to quest progression.
- `relationshipAbove` unlocks a response at a relationship threshold.
- `roll` performs a random check.

See [Conditions Reference](/reference/conditions/) for the behavior of every condition.

## Add effects

Effects change game state when a node or choice runs. The effect builder has the same search and argument controls as the condition builder.

Common examples:

- `setFlag` records that an event happened.
- `addVariable` changes a number such as gold or reputation.
- `addItem` puts an item in the player’s inventory.
- `setQuestStage` starts a quest or moves it to another stage.
- `addRelationship` changes a character’s relationship value.
- `playMusic`, `playSound`, and `playVideo` play media.
- `notify` shows a short message to the player.
- `startDialogue`, `endDialogue`, and `goToLocation` change the current flow.

See [Effects Reference](/reference/effects/) for every available effect.

## Use Source mode

Select **Source** to write the dialogue as text or review its `.dlg` file. The editor highlights Doodle’s dialogue syntax. Save the file and select **Validate** to check its syntax and references; problems then appear beside the editor and in the bottom dock.

The [Writing Dialogues](/guides/writing-dialogues/) guide teaches the language represented by the visual controls, and [DSL Syntax](/reference/dsl-syntax/) provides the compact reference.

## Test from any node

You can begin a playtest at any node, which is useful when working on a later part of a long conversation. The playtester also lets you prepare the flags, variables, inventory, quest stages, and relationships needed for that scene.

Continue to [Playtesting in Studio](/studio/playtesting/) for the complete process.
