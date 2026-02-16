---
title: Your First Game
description: Walk through building a simple game with Doodle Engine.
---

This guide walks through the starter game created by `create-doodle-engine-game` to explain how everything fits together.

## Game Configuration

Every game starts with `content/game.yaml`:

```yaml
id: game
startLocation: tavern
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables:
  gold: 100
  reputation: 0
startInventory: []
```

This sets the player's starting location, time, variables, and inventory.

## Adding a Location

Create `content/locations/tavern.yaml`:

```yaml
id: tavern
name: "@location.tavern.name"
description: "@location.tavern.description"
banner: tavern.png
music: tavern_ambience.ogg
ambient: ""
```

The `@` prefix means the value is a localization key. The actual text lives in your locale file.

## Adding a Character

Create `content/characters/bartender.yaml`:

```yaml
id: bartender
name: "@character.bartender.name"
biography: "@character.bartender.bio"
portrait: bartender.png
location: tavern
dialogue: bartender_greeting
stats: {}
```

The `location` field places the character at the tavern. The `dialogue` field points to the dialogue file that plays when the player talks to them.

## Writing a Dialogue

Create `content/dialogues/bartender_greeting.dlg`:

```
NODE start
  BARTENDER: @bartender.greeting

  CHOICE @bartender.choice.whats_news
    SET flag metBartender
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE @bartender.choice.nevermind
    GOTO farewell
  END

NODE rumors
  BARTENDER: @bartender.rumors
  GOTO farewell

NODE farewell
  BARTENDER: @bartender.farewell
  END dialogue
```

Key concepts:
- `NODE` defines a conversation point
- `BARTENDER:` sets the speaker (matches character ID, case-insensitive)
- `CHOICE` blocks define what the player can say
- Effects like `SET flag` and `ADD relationship` modify game state
- `END dialogue` closes the conversation

## Adding Locale Strings

Create `content/locales/en.yaml`:

```yaml
location.tavern.name: "The Rusty Tankard"
location.tavern.description: "A cozy tavern with worn wooden tables and the smell of hearth smoke."

character.bartender.name: "Greta"
character.bartender.bio: "The no-nonsense owner of the Rusty Tankard."

bartender.greeting: "Welcome to the Rusty Tankard! What can I do for you?"
bartender.choice.whats_news: "Any news around town?"
bartender.choice.nevermind: "Nothing, just looking around."
bartender.rumors: "Word is there's a merchant in the market square looking for help with deliveries."
bartender.farewell: "Come back anytime!"
```

All `@key` references in YAML and `.dlg` files resolve against this locale data at runtime.

## Running Your Game

```bash
yarn dev
```

The dev server:
1. Loads all content from `content/`
2. Parses `.dlg` files into dialogue entities
3. Serves content via `/api/content`
4. Watches for file changes and hot-reloads

Open `http://localhost:3000` to see your tavern, talk to the bartender, and explore your game.

## The App Component

The scaffolded `src/App.tsx` uses `GameShell`, a complete wrapper that provides splash screen, title screen, pause menu, settings, and video support out of the box:

```tsx
import { useEffect, useState } from 'react'
import type { ContentRegistry, GameConfig } from '@doodle-engine/core'
import { GameShell } from '@doodle-engine/react'

export function App() {
  const [content, setContent] = useState<{
    registry: ContentRegistry
    config: GameConfig
  } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => setContent({
        registry: data.registry,
        config: data.config,
      }))
  }, [])

  if (!content) return <div>Loading...</div>

  return (
    <GameShell
      registry={content.registry}
      config={content.config}
      title="My Game"
      subtitle="A text-based adventure"
      splashDuration={2000}
      availableLocales={[{ code: 'en', label: 'English' }]}
    />
  )
}
```

`GameShell` handles the full game lifecycle. You just provide content and configuration. See [Game Shell](../guides/game-shell/) for customization options.

## Next Steps

- [Game Shell](../guides/game-shell/): splash screen, title, pause menu, settings
- [Writing Dialogues](../guides/writing-dialogues/): branching conversations, conditions, effects
- [Creating Quests](../guides/creating-quests/): multi-stage quest tracking
- [Adding Locations](../guides/adding-locations/): maps and travel
