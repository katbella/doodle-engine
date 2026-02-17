---
title: Content Validation
description: Validate your game content and fix errors before deployment.
---

Doodle Engine includes a comprehensive content validation system that catches errors in your YAML files and dialogue DSL before you deploy your game. Validation runs automatically during development and is required before production builds.

## When Validation Runs

### During Development (`doodle dev`)

When you run `doodle dev`, validation runs automatically whenever you change a content file:

```bash
doodle dev
```

If errors are found, they're printed to the terminal, but **the dev server keeps running**. You can continue working while fixing errors.

Example output:

```
  ✏️ Content changed: content/dialogues/bartender_greeting.dlg

✗ Found 1 validation error:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "continue" points to non-existent node
  Add NODE continue or fix the GOTO target
```

### Before Building (`doodle build`)

When you run `doodle build`, validation runs first. If errors are found, **the build fails** and no production bundle is created:

```bash
doodle build
```

Example output:

```
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

### Manual Validation (`doodle validate`)

You can run validation manually without starting the dev server or building:

```bash
doodle validate
```

This is useful for:
- Quick content checks before committing
- CI/CD pipelines (validation returns exit code 1 on errors)
- Manual testing of specific changes

## What Gets Validated

### Dialogue Structure

- **Start node exists**: The `startNode` specified in a dialogue must be a valid node ID
- **No duplicate node IDs**: Each node ID must be unique within its dialogue
- **GOTO targets exist**: All `node.next`, `choice.next`, and `conditionalNext` targets must point to existing nodes

Example error:

```
content/dialogues/bartender_greeting.dlg
  Start node "invalid" not found
  Add a NODE invalid or fix the startNode reference
```

### Conditions

All conditions must have their required arguments:

| Condition | Required Arguments |
|-----------|-------------------|
| `hasFlag`, `notFlag` | `flag` |
| `hasItem`, `notItem` | `item` |
| `questAtStage` | `quest`, `stage` |
| `variableEquals`, `variableGreaterThan`, `variableLessThan` | `variable`, `value` |

Example error:

```
content/dialogues/bartender_greeting.dlg
  Node "ask_rumors" condition "hasFlag" missing required "flag" argument
```

### Effects

All effects must have their required arguments:

| Effect | Required Arguments |
|--------|-------------------|
| `setFlag`, `clearFlag` | `flag` |
| `setVariable`, `addVariable` | `variable`, `value` |
| `addItem`, `removeItem` | `item` |
| `moveItem` | `item`, `location` |
| `setQuestStage` | `quest`, `stage` |
| `addJournalEntry` | `entry` |
| `setCharacterLocation` | `character`, `location` |
| `addToParty`, `removeFromParty` | `character` |
| `setRelationship`, `addRelationship` | `character`, `value` |
| `setCharacterStat`, `addCharacterStat` | `character`, `stat`, `value` |
| `setMapEnabled` | `enabled` |
| `advanceTime` | `hours` |
| `goToLocation` | `location` |
| `startDialogue` | `dialogue` |
| `playMusic`, `playSound` | `file` |
| `playVideo` | `file` |
| `notify` | `message` |

Example error:

```
content/dialogues/bartender_greeting.dlg
  Node "greet" effect "setVariable" missing required "value" argument
```

### Character Dialogue References

Characters' `dialogue` field must reference existing dialogue IDs:

```yaml
# content/characters/bartender.yaml
id: bartender
name: "Old Pete"
dialogue: bartender_greeting  # Must exist in content/dialogues/
```

Example error:

```
content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
  Create dialogue "merchant_chat" or fix the reference
```

### Localization Keys

All `@key` references must exist in at least one locale file:

```yaml
# content/locations/tavern.yaml
id: tavern
name: "@location.tavern.name"        # Must exist in locales/*.yaml
description: "@location.tavern.desc"  # Must exist in locales/*.yaml
```

Example error:

```
content/locations/tavern.yaml
  Localization key "@location.tavern.name" not found in any locale file
  Add "location.tavern.name: ..." to your locale files
```

## Common Validation Errors and Fixes

### GOTO Target Not Found

**Error:**
```
Node "greet" GOTO "continue" points to non-existent node
```

**Cause:** You referenced a node ID in `GOTO` that doesn't exist.

**Fix:** Either create the missing node or fix the typo:

```
NODE greet
  Bartender: "Welcome to the tavern!"
  GOTO continue  # Make sure this matches exactly

NODE continue  # Add this node
  Bartender: "What can I get you?"
```

### Duplicate Node IDs

**Error:**
```
Duplicate node ID "greet"
```

**Cause:** Two nodes have the same ID.

**Fix:** Rename one of the nodes:

```
NODE greet
  Bartender: "Welcome!"

NODE greet_again  # Changed from "greet"
  Bartender: "Welcome back!"
```

### Missing Required Argument

**Error:**
```
Node "greet" condition "hasFlag" missing required "flag" argument
```

**Cause:** A condition or effect is missing a required field.

**Fix:** Add the missing argument:

```
REQUIRE hasFlag("quest_started")  # Add the flag name in quotes
  CHOICE "Ask about the quest" -> ask_quest
```

### Character References Non-Existent Dialogue

**Error:**
```
Character "merchant" references non-existent dialogue "merchant_chat"
```

**Cause:** The character's `dialogue` field points to a dialogue that doesn't exist.

**Fix:** Either create the dialogue or fix the reference:

```yaml
# content/characters/merchant.yaml
id: merchant
name: "Merchant"
dialogue: merchant_intro  # Fix: changed from merchant_chat
```

### Localization Key Not Found

**Error:**
```
Localization key "@location.tavern.name" not found in any locale file
```

**Cause:** A `@key` reference doesn't exist in any locale file.

**Fix:** Add the key to your locale files:

```yaml
# content/locales/en.yaml
location.tavern.name: "The Rusty Tankard"
location.tavern.desc: "A cozy tavern with warm firelight."
```

## Validation in CI/CD

Add validation to your CI pipeline to catch errors before merging:

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
      - run: npx doodle validate
```

The `doodle validate` command exits with code 1 if errors are found, which fails the CI build.

## Best Practices

1. **Fix errors as they appear**: Don't let validation errors accumulate. Fix them immediately when they appear in `doodle dev`.

2. **Run validation before committing**: Add `doodle validate` to your pre-commit hook or run it manually before pushing changes.

3. **Use descriptive IDs**: Clear node IDs, quest IDs, and dialogue IDs make validation errors easier to understand.

4. **Keep dialogue files small**: Smaller files make it easier to locate errors. Split large dialogues into multiple files.

5. **Use locale keys consistently**: Follow a naming convention for locale keys (e.g., `entity_type.entity_id.field`) to make missing keys easier to spot.

## Limitations

Validation catches **structural errors** but not **logic errors**:

✅ **Catches:**
- Missing nodes
- Missing required arguments
- Non-existent references

❌ **Doesn't catch:**
- Dialogue that doesn't make narrative sense
- Incorrectly set flags (e.g., setting `quest_completed` too early)
- Logic that creates softlocks or dead ends
- Typos in text content

You still need to playtest your game to catch logic and narrative issues.
