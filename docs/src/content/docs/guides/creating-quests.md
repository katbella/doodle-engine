---
title: Creating Quests
description: How to create multi-stage quests with conditions and rewards.
---

Quests track player progress through multi-stage objectives. They're defined in YAML and advanced through dialogue effects.

## Defining a Quest

Create `content/quests/odd_jobs.yaml`:

```yaml
id: odd_jobs
name: Odd Jobs
description: Help the merchants around the harbor.
stages:
    - id: started
      description: Marcus mentioned work at the market.
    - id: talked_to_merchant
      description: Elena needs someone to watch a delivery.
    - id: complete
      description: The delivery arrived safely.
```

Each stage has an `id` and a `description` shown in the player's journal.

## Starting a Quest

Use `SET questStage` in a dialogue to start or advance a quest:

```text
CHOICE Accept the job.
  SET questStage odd_jobs started
  ADD journalEntry odd_jobs_accepted
  NOTIFY New quest: Odd Jobs
  GOTO quest_details
END
```

## Advancing Stages

Check the current stage with `questAtStage` and advance with `SET questStage`:

```text
NODE check_progress
  IF questAtStage odd_jobs started
    GOTO quest_update
  END

NODE quest_update
  MERCHANT: The shipment should reach the docks by nightfall.
  SET questStage odd_jobs talked_to_merchant
  NOTIFY Quest updated: Odd Jobs
```

## Completing a Quest

```text
NODE quest_complete
  MERCHANT: The delivery arrived safely. Here is your payment.
  SET questStage odd_jobs complete
  ADD variable gold 50
  ADD variable reputation 10
  ADD relationship merchant 3
  NOTIFY Quest complete: Odd Jobs

  CHOICE Glad I could help.
    GOTO farewell
  END
```

## Conditional Content Based on Quests

Show different dialogue options based on quest state:

```text
CHOICE Ask about the merchant.
  REQUIRE questAtStage odd_jobs started
  GOTO merchant_info
END
```

Or hide content after quest completion:

```text
CHOICE Ask whether Elena needs help.
  REQUIRE notFlag questComplete
  GOTO offer_quest
END
```

## Quest Display

Active quests appear in the Journal component. Each quest shows:

- Quest name and description
- Current stage description

The Journal shows any quest that has a stage in `questProgress`. Use a stage ID such as `complete` for the final stage. A custom renderer can use that ID to separate or hide completed quests.

See [Localization](/guides/localization/) when the quest text needs to support another language.
