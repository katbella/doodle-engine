---
title: Creating Quests
description: How to create multi-stage quests with conditions and rewards.
---

Quests track player progress through multi-stage objectives. They're defined in YAML and advanced through dialogue effects, so this guide assumes you can already write a basic dialogue; [Writing Dialogues](/guides/writing-dialogues/) covers that. In Doodle Studio, quests are edited under **Quests** in the project rail, and the quest effects below are available in the effect builder.

A quest has no logic of its own. The dialogue decides when a stage changes, and the quest file supplies the names and journal text for each stage. That split means one quest can be advanced from any number of conversations.

## Defining a Quest

Each quest is one YAML file in `content/quests/`. The starter project ships this one as `content/quests/odd_jobs.yaml`:

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
      completesQuest: true
      description: "Job well done. Elena paid 50 gold for the trouble."
```

Each stage has an `id` and a `description` shown in the player's journal. Set `completesQuest: true` on every stage that ends the quest; quests may have multiple endings.

## Starting a Quest

Use `SET questStage` in a dialogue to start or advance a quest:

```text
CHOICE Accept the job.
  SET questStage odd_jobs started
  SET trackedQuest odd_jobs
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
  REQUIRE questStatus odd_jobs not_started
  GOTO offer_quest
END
```

`questStatus` checks whether a quest has `not_started`, is `active`, or is `complete`. Use `questAtStage` when a specific step matters.

## Tracking a Quest

`SET trackedQuest odd_jobs` follows an active quest, while `SET trackedQuest none` clears it. Players can also track or stop tracking active quests in the built-in Journal. Tracking clears automatically when the quest completes.

## Quest Display

The Journal separates active and completed quests. Each quest shows:

- Quest name and description
- Current stage description

A quest is `not_started` until it has a current stage, `active` while its current stage is non-completing, and `complete` when its current stage has `completesQuest: true`.

Below the quests, the same panel lists unlocked journal entries. See [Journal Entries](/guides/journal-entries/) for writing them and the `ADD journalEntry` effect used above.

## Check Your Work

Run `npm run validate`, or select **Validate** in Studio. It confirms that every `SET questStage` and `questAtStage` names an existing quest and stage. Then play the path: accept the quest, watch the notification appear, and open the Journal to see the stage description change as you progress. Studio's [Playtest](/studio/playtesting/) can set quest stages directly, which makes testing later stages fast.

See [Localization](/guides/localization/) when the quest text needs to support another language.
