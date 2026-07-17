---
title: Writing Dialogues
description: How to write branching dialogue scripts with the .dlg DSL.
---

Dialogues are written in `.dlg` files using a DSL (domain-specific language), a small scripting format made for branching conversations. Keywords such as `NODE`, `CHOICE`, `GOTO`, and `SET` describe how the conversation flows. Place dialogue files in `content/dialogues/`.

## Write Text Directly

Write dialogue and choice text as ordinary sentences:

```text
BARTENDER: Hello there.
CHOICE Ask about the locked room.
```

Most punctuation can be used directly. Put quotation marks around text containing `#` because an unquoted `#` begins a comment:

```text
BARTENDER: "Room #3, second door."
```

Speaker lines, narrator lines, choices, and notifications all accept plain text. IDs and effect arguments use letters, numbers, and underscores, as in `bartender`, `heardRumors`, and `odd_jobs`. See [Localization](/guides/localization/) when you are ready to replace displayed text with `@keys` for another language.

Here is a complete example using plain text:

```text
NODE start
  BARTENDER: Well, well. A new face. What brings you to the Salty Dog?

  CHOICE Any news around town?
    SET flag heardRumors
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE Nothing. Just passing through.
    GOTO farewell
  END

NODE rumors
  BARTENDER: Word is the merchant at the market square is looking for help. Pays well, too.
  GOTO farewell

NODE farewell
  BARTENDER: Safe travels.
  END dialogue
```

## Basic Structure

A dialogue is a graph: a set of connected **nodes**. A node can show one character or narrator line, offer choices for the player, apply effects, and route to another node:

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

### Key Rules

- The first `NODE` is the start node
- `SPEAKER:` lines set who's talking (matched to character ID, case-insensitive)
- Each node has **one** speaker line; to let another character speak, route to another node
- `NARRATOR:` lines have no speaker and are used for descriptions
- `GOTO` routes to another node
- `END dialogue` closes the conversation
- `END` (without `dialogue`) closes a CHOICE or IF block
- A node with text but no choices shows a **Continue** button, or **End Dialogue** when advancing will close the conversation.
- A node with no text and no choices is a **silent processing node** that auto-advances instantly

## Conditions on Choices

Add `REQUIRE` inside a choice when it should only be available under certain conditions:

```text
CHOICE Buy a drink for five gold.
  REQUIRE variableGreaterThan gold 4
  GOTO buy_drink
END
```

The player sees this choice when `gold` is greater than 4. See [Conditions](/reference/conditions/) for every available check.

## Effects on Choices

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

To show narration when a choice is picked, route it to a node with `GOTO` and put the line in that node.

## Conditional Branching

Use `IF` blocks for automatic branching based on conditions. Everything inside the first passing `IF` block runs:

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

If the condition passes, that IF block's effects run and its `GOTO` target is used. If a passing IF block has effects but no `GOTO`, the effects run and the node falls through to its regular `GOTO`. If no IF condition passes, the engine falls through to the next block or the node's regular `GOTO`.

## Triggered Dialogues

Dialogues can auto-trigger when the player enters a location:

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

- `TRIGGER <locationId>` runs when the player enters this location
- `REQUIRE` at the top level sets conditions that must pass for the trigger
- Pair `notFlag` with a matching `SET flag` effect for an intro that plays once

## Voice and Portrait Overrides

```text
NODE emotional_scene
  VOICE bartender_sad.ogg
  PORTRAIT bartender_sad.png
  BARTENDER: I thought we had more time.
```

- `VOICE` sets an audio file to play for this node
- `PORTRAIT` overrides the character's default portrait

## Comments

Lines starting with `#` are comments:

```text
# This node handles the quest reward
NODE quest_complete
  MERCHANT: You made it back. Here is the payment I promised.
  SET questStage odd_jobs complete
  ADD variable gold 50
```

Comments can appear anywhere. If a `#` appears inside quotes, it's preserved as text.

## Starting Other Dialogues

You can chain dialogues using the `START dialogue` effect:

```text
CHOICE Ask to speak with the merchant.
  START dialogue merchant_intro
END
```

## Complete Example

Triggered introductions and character conversations live in separate files. The triggered file begins when the player enters its location. The character conversation begins when the player selects that character in the game interface.

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

See [DSL Syntax Reference](/reference/dsl-syntax/) for the complete keyword list.
