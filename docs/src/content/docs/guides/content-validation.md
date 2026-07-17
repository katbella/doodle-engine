---
title: Content Validation
description: Check game content for errors during development and before release.
---

Validation checks the structure of YAML and dialogue files and confirms that references point to existing content. It runs during development, before builds, and whenever you run it manually.

## When Validation Runs

### During Development (`npm run dev`)

When you run `npm run dev`, validation runs automatically whenever a content file is added, edited, or deleted:

```bash
npm run dev
```

Errors appear in the terminal while the development server continues running, so you can fix them without restarting it.

Example output:

```text
  ✏️ Content changed: content/dialogues/bartender_greeting.dlg

✗ Found 1 validation error:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "continue" points to non-existent node
  Add NODE continue or fix the GOTO target
```

### Before Building (`npm run build`)

When you run `npm run build`, validation runs first. The release build begins after the content passes validation:

```bash
npm run build
```

Example output:

```text
🐕 Building Doodle Engine game...

Validating content...

✗ Found 2 validation errors:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "continue" points to non-existent node
  Add NODE continue or fix the GOTO target

content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
  Create dialogue "merchant_chat" or fix the reference

Build failed due to validation errors.
```

### Manual Validation (`npm run validate`)

You can run validation manually without starting the dev server or building:

```bash
npm run validate
```

Run this command for:

- Quick content checks before committing
- Automated checks (validation returns exit code 1 on errors)
- Checking a specific group of changes

## What Gets Validated

### Dialogue Parsing

Validation parses each `.dlg` file, turning its text into dialogue data. If the syntax is invalid, the error names the file and the part that could not be read. Examples include an unknown keyword, condition, or effect; more than one speaker line in a node; a spoken line inside a choice; or a quoted value where the language expects a plain token.

```text
content/dialogues/bartender_greeting.dlg
  Failed to parse dialogue: Node "start" (line 3) has more than one speaker line. Each node supports a single speaker; route to another NODE to let a different character speak.
  Fix the DSL syntax error in this .dlg file
```

### Dialogue Structure

- **Start node exists**: The `startNode` specified in a dialogue must be a valid node ID
- **No duplicate node IDs**: Each node ID must be unique within its dialogue
- **GOTO targets exist**: All `node.next`, `choice.next`, and `conditionalBranches[].next` targets must point to existing nodes. Exception: choices that contain `END dialogue` or `GOTO location` don't need a `GOTO` target. They terminate the dialogue.
- **IF blocks are valid**: Every conditional branch must have a valid condition, and any effects inside the branch must have their required arguments.

Example error:

```text
content/dialogues/bartender_greeting.dlg
  Start node "invalid" not found
  Add a NODE invalid or fix the startNode reference
```

### Conditions

All conditions must have their required arguments:

| Condition                                                   | Required Arguments              |
| ----------------------------------------------------------- | ------------------------------- |
| `hasFlag`, `notFlag`                                        | `flag`                          |
| `hasItem`                                                   | `itemId`                        |
| `questAtStage`                                              | `questId`, `stageId`            |
| `atLocation`                                                | `locationId`                    |
| `characterAt`                                               | `characterId`, `locationId`     |
| `characterInParty`                                          | `characterId`                   |
| `relationshipAbove`, `relationshipBelow`                    | `characterId`, `value`          |
| `variableEquals`, `variableGreaterThan`, `variableLessThan` | `variable`, `value`             |
| `itemAt`                                                    | `itemId`, `locationId`          |
| `timeIs`                                                    | `startHour`, `endHour`          |
| `roll`                                                      | `min`, `max`, `threshold`       |

Example error:

```text
content/dialogues/bartender_greeting.dlg
  Node "ask_rumors" condition "hasFlag" missing required "flag" argument
```

### Effects

All node, choice, and IF branch effects must have their required arguments:

| Effect                                 | Required Arguments             |
| -------------------------------------- | ------------------------------ |
| `setFlag`, `clearFlag`                 | `flag`                         |
| `setVariable`, `addVariable`           | `variable`, `value`            |
| `addItem`, `removeItem`                | `itemId`                       |
| `moveItem`                             | `itemId`, `locationId`         |
| `setQuestStage`                        | `questId`, `stageId`           |
| `addJournalEntry`                      | `entryId`                      |
| `setCharacterLocation`                 | `characterId`, `locationId`    |
| `addToParty`, `removeFromParty`        | `characterId`                  |
| `setRelationship`, `addRelationship`   | `characterId`, `value`         |
| `setCharacterStat`, `addCharacterStat` | `characterId`, `stat`, `value` |
| `setMapEnabled`                        | `enabled`                      |
| `advanceTime`                          | `hours`                        |
| `goToLocation`                         | `locationId`                   |
| `startDialogue`                        | `dialogueId`                   |
| `playMusic`                            | _(none; bare `MUSIC` clears override)_ |
| `playSound`                            | `sound`                        |
| `playVideo`                            | `file`                         |
| `showInterlude`                        | `interludeId`                  |
| `notify`                               | `message`                      |
| `endDialogue`                          | _(none)_                       |
| `roll`                                 | `variable`, `min`, `max`       |

Example error:

```text
content/dialogues/bartender_greeting.dlg
  Node "greet" effect "setVariable" missing required "value" argument
```

### Character Dialogue References

Characters' `dialogue` field must reference existing dialogue IDs:

```yaml
# content/characters/bartender.yaml
id: bartender
name: 'Old Pete'
dialogue: bartender_greeting # Must exist in content/dialogues/
```

Example error:

```text
content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
Create dialogue "merchant_chat" or fix the reference
```

### Files and Required Fields

Every content file must load before its fields and references can be checked:

- A YAML file with a syntax error is reported by name, and the other files in its folder still load
- A YAML entity file must have an `id`
- Two files of the same type cannot share an `id`; the clash is reported with both file names
- An invalid `game.yaml` is reported by name
- Each entity must have the fields the engine reads: locations need `name` and `description`, characters need `name`, items need `name` and `location`, maps need `name`, quests need `name` and at least one stage, journal entries need `title` and `text`, interludes need `text`
- Content IDs, dialogue node IDs, quest stage IDs, flags, and variables may contain only letters, numbers, and underscores

### Content References

Validation also checks IDs used by game config and built-in gameplay references:

- `game.yaml` `startLocation` must point to an existing location
- `game.yaml` `startInventory` entries must point to existing items
- Character starting locations must exist
- Item starting locations must be `inventory`, an existing location, or an existing character
- Dialogue speakers must be existing characters
- Dialogue and interlude trigger locations must exist
- Top-level dialogue `REQUIRE` conditions and interlude `triggerConditions` are checked like any other condition
- Built-in condition references must point to existing locations, items, characters, quests, and quest stages
- Built-in effect references must point to existing locations, items, characters, quests, quest stages, journal entries, dialogues, and interludes

For `.dlg` files, validation follows the condition and effect names documented in the references.

### Numbers

Arguments that hold a number must contain a numeric value. For example,
`ADD variable gold ten` reports an error because `ten` is text.

### Maps

Maps must reference existing locations, and `scale` must be greater than zero
(it turns marker distance into travel hours). A game can contain multiple
maps, but a location can only appear on one map. That keeps the current map
unambiguous: the engine shows the map that contains the player's current
location.

### Asset Files

The asset manifest is the list of media files included with the game. Missing
images, audio, and video are reported when this list is created: during
`npm run dev` when the browser loads the game and at the start of every build.
`npm run validate` checks content and references; it does not scan media files.

### Localization Keys

All `@key` references must exist in at least one locale file:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name' # Must exist in locales/*.yaml
description: '@location.tavern.desc' # Must exist in locales/*.yaml
```

Example error:

```text
content/locations/tavern.yaml
  Localization key "@location.tavern.name" not found in any locale file
  Add "location.tavern.name: ..." to your locale files
```

## Common Validation Errors and Fixes

### GOTO Target Not Found

**Error:**

```text
Node "greet" GOTO "continue" points to non-existent node
```

**Cause:** You referenced a node ID in `GOTO` that doesn't exist.

**Fix:** Either create the missing node or fix the typo:

```text
NODE greet
  Bartender: "Welcome to the tavern!"
  GOTO continue  # Make sure this matches exactly

NODE continue  # Add this node
  Bartender: "What can I get you?"
```

### Duplicate Node IDs

**Error:**

```text
Duplicate node ID "greet"
```

**Cause:** Two nodes have the same ID.

**Fix:** Rename one of the nodes:

```text
NODE greet
  Bartender: "Welcome!"

NODE greet_again  # Changed from "greet"
  Bartender: "Welcome back!"
```

### Missing Required Argument

**Error:**

```text
Node "greet" condition "hasFlag" missing required "flag" argument
```

**Cause:** A condition or effect is missing a required field.

**Fix:** Add the missing argument:

```text
CHOICE "Ask about the quest"
  REQUIRE hasFlag quest_started
  GOTO ask_quest
END
```

### Character References Non-Existent Dialogue

**Error:**

```text
Character "merchant" references non-existent dialogue "merchant_chat"
```

**Cause:** The character's `dialogue` field points to a dialogue that doesn't exist.

**Fix:** Either create the dialogue or fix the reference:

```yaml
# content/characters/merchant.yaml
id: merchant
name: 'Merchant'
dialogue: merchant_intro # Fix: changed from merchant_chat
```

### Localization Key Not Found

**Error:**

```text
Localization key "@location.tavern.name" not found in any locale file
```

**Cause:** A `@key` reference doesn't exist in any locale file.

**Fix:** Add the key to your locale files:

```yaml
# content/locales/en.yaml
location.tavern.name: 'The Rusty Tankard'
location.tavern.desc: 'A cozy tavern with warm firelight.'
```

## Automated Validation

Continuous integration (CI) services can run validation whenever changes are pushed:

```yaml
# .github/workflows/validate.yml
name: Validate Content

on: [push, pull_request]

jobs:
    validate:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 24
            - run: npm install
            - run: npm run validate
```

`npm run validate` returns exit code 1 when it finds errors, which tells the CI service that the check failed.

## Best Practices

1. **Fix errors while the change is fresh**: Resolve errors when they appear in `npm run dev`.

2. **Run validation before committing**: Run `npm run validate` before pushing changes to catch errors early.

3. **Use descriptive IDs**: Clear node IDs, quest IDs, and dialogue IDs make validation errors easier to understand.

4. **Split long dialogues when it improves navigation**: Focused files make errors easier to locate.

5. **Use locale keys consistently**: Follow a naming convention for locale keys (e.g., `entity_type.entity_id.field`) to make missing keys easier to spot.

## Validation and Playtesting

Validation finds structural problems such as missing nodes, required arguments,
and references to content that does not exist. Playtesting shows whether the
story and rules behave as intended, including flag timing, dead ends, and text
that needs revision. Use both before release.
