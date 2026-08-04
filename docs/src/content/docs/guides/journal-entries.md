---
title: Journal Entries
description: Lore, people, and places the player collects as the story reveals them.
---

A journal entry is a piece of writing the player unlocks: a rumor they heard, a person they met, a place they found. Entries appear in the Journal panel below the active quests, and once unlocked they stay.

Entries are independent of quests. A quest moves through stages, while an entry is either unlocked or it is not. A quest can unlock entries as it goes, and so can any other conversation.

## Defining an entry

Each entry is one YAML file in `content/journal/`. The starter project ships three. This is `content/journal/tavern_discovery.yaml`:

```yaml
id: tavern_discovery
title: "@journal.tavern_discovery.title"
text: "@journal.tavern_discovery.text"
category: places
```

| Field      | Description                                       |
| ---------- | ------------------------------------------------- |
| `id`       | Unique identifier, used by `ADD journalEntry`     |
| `title`    | Heading shown in the Journal                      |
| `text`     | The entry body                                    |
| `category` | Groups the entry, for example `lore` or `places`  |

The starter entries use `@keys` because that project demonstrates localization. You can write the words directly into `title` and `text` instead.

## Unlocking an entry

Use the `ADD journalEntry` effect in a dialogue node, choice, or `IF` branch:

```text
NODE rumors
  BARTENDER: They say an old coin washed up by the docks.
  ADD journalEntry tavern_discovery
  NOTIFY Journal Updated
```

Adding an entry the player already has does nothing, so it is safe to unlock the same entry from several conversations.

## Categories

`category` groups entries and sets a CSS class on each one. The example above gets `journal-category-places`, which your own renderer can style or filter on. The starter uses `places`, and you can pick whatever names suit your game.

## Check your work

Run `npm run validate`, or select **Validate** in Studio. It confirms every `ADD journalEntry` names an entry that exists, that each entry has a `title` and `text`, and that any `@keys` resolve. Then play the moment that unlocks it and open the Journal to read the entry.

[Creating Quests](/guides/creating-quests/) covers the other half of the Journal panel. [Player Notes](/guides/player-notes/) covers what the player writes there themselves.
