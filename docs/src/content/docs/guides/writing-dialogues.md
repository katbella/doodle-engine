---
title: Writing Dialogues
description: How to write branching dialogue scripts with the .dlg DSL.
---

This guide builds a branching conversation in a `.dlg` file and explains the dialogue language as you use it. Start with the project created in [Your First Game](/getting-started/your-first-game/).

If you work with the CLI and a separate text editor, keep the game running with `npm run dev` while you make changes. In Doodle Studio, you can write the same file in Source mode or use the node editor in Visual mode. [Dialogue Editing in Studio](/studio/dialogues/) explains those controls, and [Playtesting in Studio](/studio/playtesting/) shows how to test the conversation without leaving Doodle Studio.

Dialogues are written in a DSL (domain-specific language), a small scripting format made for branching conversations. Keywords such as `NODE`, `CHOICE`, `GOTO`, and `SET` describe how the conversation flows. Dialogue files live in `content/dialogues/`, and each file's name becomes its dialogue ID: `bartender_greeting.dlg` is the dialogue `bartender_greeting`.

## Basic Structure

A dialogue is a graph: a set of connected **nodes**. A node is one moment in the conversation. It can show one character or narrator line, offer choices, apply effects, and route onward. The first `NODE` in the file is where the conversation starts.

```text
NODE start
  BARTENDER: Welcome to the Salty Dog.

  CHOICE Ask about the town.
    GOTO news
  END

  CHOICE Say goodbye.
    GOTO farewell
  END

NODE news
  BARTENDER: The merchant in the square is looking for help.
  GOTO farewell

NODE farewell
  BARTENDER: Safe travels.
  END dialogue
```

Each keyword in that example does one job. `BARTENDER:` is a speaker line, and the name before the colon is matched to a character ID, case-insensitively. `CHOICE` starts an option the player can pick, and `END` closes it. `GOTO` routes to another node. `END dialogue` closes the conversation, while a bare `END` only closes a `CHOICE` or `IF` block.

Each node holds one speaker line. To let another character answer, route to a new node where that character speaks. For text with no speaker, use `NARRATOR:`.

What the player sees depends on what the node contains. A node with choices shows them as buttons. A node with text but no choices shows a **Continue** button, or **End Dialogue** when continuing would close the conversation. A node with no text and no choices is a silent processing node: the engine applies its effects and advances instantly, which is useful for dice rolls and hidden branching.

## Write Text Directly

Write dialogue and choice text as ordinary sentences:

```text
BARTENDER: Hello there.
CHOICE Ask about the locked room.
```

Most punctuation works as-is, including colons inside the line. The one character to watch is `#`.

:::caution
An unquoted `#` starts a comment, so everything after it disappears from the line. Put quotation marks around text that needs a literal `#`:

```text
BARTENDER: "Room #3, second door."
```
:::

To keep a paragraph break inside one dialogue entry, wrap the entry in quotation marks and continue it on the following lines:

```text
BARTENDER: "I've been having a good time.

It's been 84 years."
```

The full entry appears before the player continues or chooses a response. Single-line dialogue does not need quotation marks.

Speaker lines, narrator lines, choices, and notifications all accept plain text. IDs and effect arguments are different: they use letters, numbers, and underscores only, as in `bartender`, `heardRumors`, and `odd_jobs`. When your game needs another language, [Localization](/guides/localization/) explains how to replace displayed text with `@keys`.

## Choices

A choice holds the words shown to the player, an optional set of conditions and effects, and the place the conversation goes next.

Add `REQUIRE` inside a choice when it should only be available under certain conditions:

```text
CHOICE Buy a drink for five gold.
  REQUIRE variableGreaterThan gold 4
  GOTO buy_drink
END
```

The player sees this choice only when `gold` is greater than 4. A choice with a failing condition is hidden, not greyed out. See [Conditions](/reference/conditions/) for every available check.

Effects change game state after the player selects a choice:

```text
CHOICE Buy a drink for five gold.
  ADD variable gold -5
  ADD variable _drinksBought 1
  ADD relationship bartender 1
  NOTIFY You bought a drink.
  GOTO after_drink
END
```

The effects run from top to bottom before the conversation moves to `after_drink`. Conditions and effects can be used together in the same choice.

To show narration or a reply when a choice is picked, route it to a node with `GOTO` and put the line in that node. A choice holds its text, conditions, effects, and route.

## Conditional Branching

Use `IF` blocks for automatic branching based on conditions. The player never sees an `IF` block. It is routing you control.

```text
NODE check_quest
  IF questAtStage odd_jobs started
    SET flag mentionedOddJobs
    GOTO quest_update
  END
  IF questAtStage odd_jobs complete
    GOTO quest_done
  END
  GOTO default_greeting
```

The engine checks `IF` blocks from top to bottom and runs the first one whose condition passes: its effects run, and its `GOTO` target is used. If a passing block has effects but no `GOTO`, the effects run and the node falls through to its regular `GOTO`. If no condition passes, the engine also falls through to the node's regular `GOTO`.

## Triggered Dialogues

Dialogues can start automatically when the player enters a location. Declare the trigger at the top of the file, before any `NODE`:

```text
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: The tavern falls quiet as you enter.
  SET flag seenTavernIntro

  CHOICE Look around.
    END dialogue
  END
```

`TRIGGER <locationId>` runs the dialogue when the player enters that location, and top-level `REQUIRE` lines set the conditions the trigger needs. Pairing `notFlag` with a matching `SET flag` effect, as above, makes an intro play exactly once.

## Voice and Portrait Overrides

```text
NODE emotional_scene
  VOICE bartender_sad.ogg
  PORTRAIT bartender_sad.png
  BARTENDER: I thought we had more time.
```

`VOICE` sets an audio file to play for this node, and `PORTRAIT` overrides the character's default portrait, for example to show a different expression. Both files are looked up in the standard asset folders described in [Assets & Media](/guides/assets-and-media/).

## Format Dialogue Text

Add formatting around the exact words you want to emphasize:

```text
BARTENDER: He hands you a cE5C453[*key*].
NARRATOR: _For a moment, nobody speaks._
CHOICE Take the *key*.
```

The player sees:

- **Bartender:** He hands you a <span style="color: #E5C453"><strong>key</strong></span>.
- **Narrator:** _For a moment, nobody speaks._
- **Choice:** Take the **key**.

| Effect         | Syntax                           | Output                                                   |
| -------------- | -------------------------------- | -------------------------------------------------------- |
| Bold           | `*key*`                          | **key**                                                  |
| Italic         | `_For a moment, nobody speaks._` | _For a moment, nobody speaks._                           |
| Color          | `cE5C453[key]`                   | <span style="color: #E5C453">key</span>                  |
| Bold and color | `cE5C453[*key*]`                 | <span style="color: #E5C453"><strong>key</strong></span> |

Formatting can be nested and works in both dialogue text and locale values. Put a backslash before `*`, `_`, or a color expression when those characters should appear as ordinary text.

## Comments

Lines starting with `#` are comments:

```text
# This node handles the quest reward
NODE quest_complete
  MERCHANT: You made it back. Here is the payment I promised.
  SET questStage odd_jobs complete
  ADD variable gold 50
```

Comments can appear anywhere. A `#` inside quotes is preserved as text.

## Starting Other Dialogues

Chain dialogues with the `START dialogue` effect:

```text
CHOICE Ask to speak with the merchant.
  START dialogue merchant_intro
END
```

The current dialogue ends and the new one begins at its first node. Use it for self-contained sequences. For a branch that should return to earlier choices, keep the nodes in the same file and route back with `GOTO`.

## Complete Example

Triggered introductions and character conversations live in separate files. The triggered file begins when the player enters its location. The character conversation begins when the player selects that character in the game interface.

The starter project ships both files with more branches than shown here.

`content/dialogues/tavern_intro.dlg`:

```text
# Plays automatically the first time the player enters the tavern
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: The tavern falls quiet as you enter.
  SET flag seenTavernIntro

  CHOICE Look around.
    END dialogue
  END
```

`content/dialogues/bartender_greeting.dlg`:

```text
# Begins when the player selects the bartender in the game interface
NODE start
  BARTENDER: Welcome to the Salty Dog. What can I get you?

  CHOICE Ask about rumors.
    REQUIRE notFlag heardRumors
    SET flag heardRumors
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE Buy a drink for five gold.
    REQUIRE variableGreaterThan gold 4
    ADD variable gold -5
    NOTIFY You bought a drink.
    GOTO after_drink
  END

  CHOICE Say goodbye.
    GOTO farewell
  END

NODE rumors
  BARTENDER: They say an old coin washed up by the docks.
  ADD item old_coin
  NOTIFY Old coin added to inventory.
  GOTO start

NODE after_drink
  BARTENDER: There you are. Best ale on the coast.
  GOTO start

NODE farewell
  BARTENDER: Safe travels.
  END dialogue
```

## Check Your Work

Save the file and run `npm run validate`, or select **Validate** in Studio. Validation catches the usual dialogue mistakes immediately: a `GOTO` pointing at a node that does not exist, a missing effect argument, or a speaker that matches no character. During `npm run dev`, the same checks run automatically every time you save.

Then play the branch. Talk to the character in the running game, or use Studio's [Playtest](/studio/playtesting/) to start at any node and see exactly why a choice is shown or hidden.

For the full keyword list and the finer grammar rules, see the [DSL Syntax reference](/reference/dsl-syntax/). [Dice & Randomness](/guides/dice-and-randomness/) builds on silent nodes for skill checks, and [Creating Quests](/guides/creating-quests/) connects dialogue to quest progress.
