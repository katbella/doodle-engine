---
title: Localization
description: How to localize your game with the @key system.
---

Doodle Engine uses a simple `@key` system for localization. All player-visible text should use localization keys so your game can be translated.

## Locale Files

Create flat key-value YAML files in `content/locales/`:

```yaml
# content/locales/en.yaml
location.tavern.name: 'The Rusty Tankard'
location.tavern.description: 'A cozy tavern with worn wooden tables.'
character.bartender.name: 'Greta'
bartender.greeting: 'Welcome! What can I do for you?'
```

```yaml
# content/locales/es.yaml
location.tavern.name: 'La Jarra Oxidada'
location.tavern.description: 'Una taberna acogedora con mesas de madera gastadas.'
character.bartender.name: 'Greta'
bartender.greeting: '¡Bienvenido! ¿Qué puedo hacer por ti?'
```

Locale files are loaded by filename: `en.yaml` becomes locale `"en"`, `es.yaml` becomes `"es"`.

## Using @keys

Reference locale strings with the `@` prefix in YAML content:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
description: '@location.tavern.description'
```

And in `.dlg` dialogue files:

```
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.hello
    GOTO hello
  END
```

## How Resolution Works

At snapshot build time, the engine resolves all `@key` references:

1. Looks up the key in the current locale's data
2. If found, returns the translated string
3. If not found, returns the `@key` as-is (useful for spotting missing translations)

The resolution function:

```typescript
import { resolveText } from '@doodle-engine/core';

const text = resolveText('@bartender.greeting', localeData);
// → "Welcome! What can I do for you?"
```

## Changing Language at Runtime

Use the `setLocale` action:

```tsx
const { actions } = useGame();
actions.setLocale('es');
```

Or from a dialogue effect. This isn't built into the DSL, but can be done programmatically via the engine.

## Naming Convention

Use a consistent key naming scheme:

```
# Locations
location.<id>.name
location.<id>.description

# Characters
character.<id>.name
character.<id>.bio

# Dialogue text
<character_id>.<context>
<character_id>.choice.<choice_name>

# Items
item.<id>.name
item.<id>.description

# Quests
quest.<id>.name
quest.<id>.description
quest.<id>.stage.<stage_id>

# Notifications
notification.<event_name>

# Narrator
narrator.<context>
```

## Notification Strings

Notification effects use `@key` too:

```
NOTIFY @notification.quest_started
```

```yaml
notification.quest_started: 'New Quest: Odd Jobs'
```
