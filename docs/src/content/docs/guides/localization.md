---
title: Localization
description: How to localize your game with the @key system.
---

Doodle Engine can display text directly or look it up through a localization key. Write text directly while working in one language. When you are ready to translate the game, use `@key` references to connect player-facing text to locale files.

For visual editing, see [Localization in Studio](/studio/localization/). This guide explains the files and renderer APIs behind it.

## Locale Files

Create a YAML file for each language in `content/locales/`. Each entry pairs a localization key with the text for that language:

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

The filename sets the locale code: `en.yaml` becomes `"en"`, and `es.yaml` becomes `"es"`.

For a translation with paragraph breaks, use YAML's `|` marker. It keeps the line breaks in the indented text that follows:

```yaml
bartender.memory: |
    I've been having a good time.

    It's been 84 years.
```

Dialogue using `@bartender.memory` displays those paragraphs as one entry.

## Using @keys

Reference locale strings with the `@` prefix in YAML content:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
description: '@location.tavern.description'
```

And in `.dlg` dialogue files:

```text
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.hello
    GOTO hello
  END
```

## How Resolution Works

When the engine prepares text for the renderer, it resolves each `@key` reference:

1. Looks up the key in the current locale's data
2. If found, returns the translated string
3. If the key is missing, displays the `@key` so you can identify the missing translation

The resolution function:

```typescript
import { resolveText } from '@doodle-engine/core';

const text = resolveText('@bartender.greeting', localeData);
// "Welcome! What can I do for you?"
```

## Changing Language at Runtime

Use the `setLocale` action:

```tsx
const { actions } = useGame();
actions.setLocale('es');
```

Change the language from your renderer or shell by calling `actions.setLocale()` or `engine.setLocale()`.

## Naming Convention

Use a consistent key naming scheme:

```text
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

## Translate the Built-in Interface

Buttons, menus, panel headings, credits, and other text in the built-in renderer use `ui.*` keys. Add the keys you want to translate to each locale file:

```yaml
# content/locales/es.yaml
ui.continue: Continuar
ui.end_dialogue: Terminar diálogo
ui.settings: Configuración
ui.new_game: Nuevo juego
ui.credits: Créditos
ui.made_with_doodle_engine: Hecho con Doodle Engine
ui.back: Volver
```

The renderer uses its English default for a `ui.*` key omitted from a locale. Some keys contain placeholders such as `{day}`, `{hours}`, or `{destination}`. Keep those placeholders in the translated text so the renderer can insert the current value.

See [UI Strings](/reference/ui-strings/) for the complete list of keys and English defaults. See [Notifications](/guides/notifications/) for displaying short messages from dialogue effects.
