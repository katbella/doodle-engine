---
title: Creating Quests
description: How to create multi-stage quests with conditions and rewards.
---

Quests track player progress through multi-stage objectives. They're defined in YAML and advanced through dialogue effects.

## Defining a Quest

Create `content/quests/odd_jobs.yaml`:

```yaml
id: odd_jobs
name: '@quest.odd_jobs.name'
description: '@quest.odd_jobs.description'
stages:
    - id: started
      description: '@quest.odd_jobs.stage.started'
    - id: talked_to_merchant
      description: '@quest.odd_jobs.stage.talked_to_merchant'
    - id: complete
      description: '@quest.odd_jobs.stage.complete'
```

Each stage has an `id` and a `description` shown in the player's journal.

## Starting a Quest

Use `SET questStage` in a dialogue to start or advance a quest:

```
CHOICE @merchant.choice.accept_quest
  SET questStage odd_jobs started
  ADD journalEntry odd_jobs_accepted
  NOTIFY @notification.quest_started
  GOTO quest_details
END
```

## Advancing Stages

Check the current stage with `questAtStage` and advance with `SET questStage`:

```
NODE check_progress
  IF questAtStage odd_jobs started
    GOTO quest_update
  END

NODE quest_update
  MERCHANT: @merchant.quest_update
  SET questStage odd_jobs talked_to_merchant
  NOTIFY @notification.quest_updated
```

## Completing a Quest

```
NODE quest_complete
  MERCHANT: @merchant.quest_complete
  SET questStage odd_jobs complete
  ADD variable gold 50
  ADD variable reputation 10
  ADD relationship merchant 3
  NOTIFY @notification.quest_complete

  CHOICE @merchant.choice.glad_to_help
    GOTO farewell
  END
```

## Conditional Content Based on Quests

Show different dialogue options based on quest state:

```
CHOICE @bartender.choice.ask_about_merchant
  REQUIRE questAtStage odd_jobs started
  GOTO merchant_info
END
```

Or hide content after quest completion:

```
CHOICE @merchant.choice.need_help
  REQUIRE notFlag questComplete
  GOTO offer_quest
END
```

## Quest Display

Active quests appear in the Journal component. Each quest shows:

- Quest name and description
- Current stage description

Quests are considered "active" when they have any stage set in `questProgress`. There's no built-in "completed" filtering, so if you want to hide completed quests, use a stage name like `complete` and handle it in a custom renderer.

## Locale Strings

```yaml
quest.odd_jobs.name: 'Odd Jobs'
quest.odd_jobs.description: 'Help the local merchants with various tasks.'
quest.odd_jobs.stage.started: 'The merchant mentioned needing help with deliveries.'
quest.odd_jobs.stage.talked_to_merchant: "Agreed to handle the merchant's deliveries."
quest.odd_jobs.stage.complete: 'All deliveries completed successfully.'
notification.quest_started: 'New Quest: Odd Jobs'
notification.quest_complete: 'Quest Complete: Odd Jobs (+50 gold, +10 reputation)'
```
