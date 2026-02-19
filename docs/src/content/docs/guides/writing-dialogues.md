---
title: Writing Dialogues
description: How to write branching dialogue scripts with the .dlg DSL.
---

Dialogues are written in `.dlg` files using a simple DSL (domain-specific language): a small, purpose-built scripting format designed specifically for writing branching conversations. You don't need to know any programming language. The DSL uses plain keywords like `NODE`, `CHOICE`, `GOTO`, and `SET` to describe dialogue flow. Place dialogue files in `content/dialogues/`.

## Quick Start (No Localization Needed)

You can write dialogue text directly (no locale files required). There are three forms:

```
BARTENDER: Hello there             # plain text, fine for simple lines
BARTENDER: "Hello, friend!"        # quotes when text has special characters or starts with @
BARTENDER: @bartender.greeting     # localization key for multi-language support
```

Use plain text for most things. Add quotes when your text contains `:`, `#`, or starts with `@`. Use `@keys` only when you need multiple languages.

Here's a complete example using plain and quoted text:

```
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

See [Localization](/guides/localization/) when you're ready to support multiple languages.

## Basic Structure

A dialogue is a graph of **nodes**. Each node has a speaker, text, and optional choices:

```
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.ask_news
    GOTO news
  END

  CHOICE @bartender.choice.goodbye
    GOTO farewell
  END

NODE news
  BARTENDER: @bartender.news
  GOTO farewell

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
```

### Key rules:

- The first `NODE` is the start node
- `SPEAKER:` lines set who's talking (matched to character ID, case-insensitive)
- `NARRATOR:` lines have no speaker and are used for descriptions
- `GOTO` routes to another node
- `END dialogue` closes the conversation
- `END` (without `dialogue`) closes a CHOICE or IF block

## Choices with Effects

Choices can trigger effects that modify game state:

```
CHOICE @bartender.choice.buy_drink
  REQUIRE variableGreaterThan gold 4
  ADD variable gold -5
  ADD variable _drinksBought 1
  ADD relationship bartender 1
  NOTIFY @notification.bought_drink
  GOTO after_drink
END
```

- `REQUIRE` only shows this choice if the condition passes
- Multiple effects run in order when the choice is selected

## Conditional Branching

Use `IF` blocks for automatic branching based on conditions:

```
NODE check_quest
  IF questAtStage odd_jobs started
    GOTO quest_update
  END
  IF questAtStage odd_jobs complete
    GOTO quest_done
  END
  GOTO default_greeting
```

If the condition passes, the `GOTO` fires. Otherwise, the engine falls through to the next block.

## Triggered Dialogues

Dialogues can auto-trigger when the player enters a location:

```
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: @narrator.tavern_intro
  SET flag seenTavernIntro

  CHOICE @narrator.choice.look_around
    END dialogue
  END
```

- `TRIGGER <locationId>` fires when the player enters this location
- `REQUIRE` at the top level sets conditions that must pass for the trigger
- Use `notFlag` to ensure one-time intros only play once

## Voice and Portrait Overrides

```
NODE emotional_scene
  VOICE bartender_sad.ogg
  PORTRAIT bartender_sad.png
  BARTENDER: @bartender.sad_dialogue
```

- `VOICE` sets an audio file to play for this node
- `PORTRAIT` overrides the character's default portrait

## Comments

Lines starting with `#` are comments:

```
# This node handles the quest reward
NODE quest_complete
  MERCHANT: @merchant.quest_complete
  SET questStage odd_jobs complete
  ADD variable gold 50
```

Comments can appear anywhere. If a `#` appears inside quotes, it's preserved as text.

## Starting Other Dialogues

You can chain dialogues using the `START dialogue` effect:

```
CHOICE @bartender.choice.talk_to_merchant
  START dialogue merchant_intro
END
```

## Complete Example

Triggered intro and character conversation live in separate files. The triggered file auto-plays when the player enters the location. The character file plays when the player clicks the character.

`content/dialogues/tavern_intro.dlg`:

```
# Plays automatically the first time the player enters the tavern
TRIGGER tavern
REQUIRE notFlag seenTavernIntro

NODE start
  NARRATOR: @narrator.tavern_intro
  SET flag seenTavernIntro

  CHOICE @narrator.choice.look_around
    END dialogue
  END
```

`content/dialogues/bartender_greeting.dlg`:

```
# Plays when the player clicks the bartender character
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.ask_rumors
    REQUIRE notFlag heardRumors
    SET flag heardRumors
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE @bartender.choice.buy_drink
    REQUIRE variableGreaterThan gold 4
    ADD variable gold -5
    NOTIFY @notification.bought_drink
    GOTO after_drink
  END

  CHOICE @bartender.choice.goodbye
    GOTO farewell
  END

NODE rumors
  BARTENDER: @bartender.rumors
  ADD item old_coin
  NOTIFY @notification.found_coin
  GOTO start

NODE after_drink
  BARTENDER: @bartender.after_drink
  GOTO start

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
```

See [DSL Syntax Reference](/reference/dsl-syntax/) for the complete keyword list.
