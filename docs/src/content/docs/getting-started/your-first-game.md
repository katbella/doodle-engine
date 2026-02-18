---
title: Your First Game
description: Walk through building a simple game with Doodle Engine.
---

This guide walks through the starter game created by the scaffolder to explain how everything fits together.

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
name: 'The Salty Dog'
description: 'A cozy tavern with worn wooden tables and the smell of hearth smoke.'
banner: tavern.png
music: tavern_ambience.ogg
ambient: ''
```

Text can be written inline like this, or as localization keys (`@location.tavern.name`) that resolve from a locale file. Inline text is simpler for getting started. See [Localization](/guides/localization/) when you're ready to support multiple languages.

## Adding a Character

Create `content/characters/bartender.yaml`:

```yaml
id: bartender
name: 'Greta'
biography: 'The no-nonsense owner of the Salty Dog.'
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
  BARTENDER: "Welcome to the Salty Dog! What can I do for you?"

  CHOICE "Any news around town?"
    SET flag metBartender
    ADD relationship bartender 1
    GOTO rumors
  END

  CHOICE "Nothing, just looking around."
    GOTO farewell
  END

NODE rumors
  BARTENDER: "Word is there's a merchant in the market square looking for help with deliveries."
  GOTO farewell

NODE farewell
  BARTENDER: "Come back anytime!"
  END dialogue
```

Key concepts:

- `NODE` defines a conversation point
- `BARTENDER:` sets the speaker (matches character ID, case-insensitive)
- `CHOICE` blocks define what the player can say
- Effects like `SET flag` and `ADD relationship` modify game state
- `END dialogue` closes the conversation

Text is written inline with quotes here. When you're ready to support multiple languages, move text to a locale file and use `@key` references. See [Localization](/guides/localization/).

## Running Your Game

```bash
npm run dev
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
import { useEffect, useState } from 'react';
import type {
    ContentRegistry,
    GameConfig,
    AssetManifest,
} from '@doodle-engine/core';
import { GameShell } from '@doodle-engine/react';

export function App() {
    const [content, setContent] = useState<{
        registry: ContentRegistry;
        config: GameConfig;
        manifest: AssetManifest;
    } | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/content').then((res) => res.json()),
            fetch('/api/manifest').then((res) => res.json()),
        ]).then(([contentData, manifestData]) => {
            setContent({
                registry: contentData.registry,
                config: contentData.config,
                manifest: manifestData,
            });
        });
    }, []);

    if (!content)
        return (
            <div className="app-bootstrap">
                <div className="spinner" />
            </div>
        );

    return (
        <GameShell
            registry={content.registry}
            config={content.config}
            manifest={content.manifest}
            title="My Game"
            subtitle="A text-based adventure"
            availableLocales={[{ code: 'en', label: 'English' }]}
        />
    );
}
```

`GameShell` handles the full game lifecycle. You just provide content and configuration. See [Game Shell](/guides/game-shell/) for customization options.

## Next Steps

- [Game Shell](/guides/game-shell/): splash screen, title, pause menu, settings
- [Writing Dialogues](/guides/writing-dialogues/): branching conversations, conditions, effects
- [Creating Quests](/guides/creating-quests/): multi-stage quest tracking
- [Adding Locations](/guides/adding-locations/): maps and travel
