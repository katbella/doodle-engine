---
title: Project Structure
description: How a Doodle Engine game project is organized.
---

A scaffolded game project has this structure:

```text
my-game/
  content/
    characters/       # Character YAML files
    dialogues/        # Dialogue .dlg files
    interludes/       # Interlude YAML files
    items/            # Item YAML files
    journal/          # Journal entry YAML files
    locales/          # Locale YAML files (en.yaml, es.yaml, etc.)
    locations/        # Location YAML files
    maps/             # Map YAML files
    quests/           # Quest YAML files
    game.yaml         # Game configuration
  assets/
    images/
      banners/        # Location and interlude banner images
      portraits/      # Character portrait images
      items/          # Item icons and detail images
      maps/           # Map background images
    audio/
      music/          # Music tracks
      sfx/            # Game sound effects and ambient sounds
      ui/             # Renderer UI sounds
      voice/          # Dialogue voice lines
    video/            # Cutscene video files
  src/
    main.tsx          # Entry point
    App.tsx           # Root component
    index.css         # Styles
  index.html          # HTML shell
  package.json
  tsconfig.json
```

## Content Directory

All game content lives in `content/`. The engine loads files by directory:

| Directory     | File Type | Entity                 |
| ------------- | --------- | ---------------------- |
| `characters/` | `.yaml`   | Character definitions  |
| `dialogues/`  | `.dlg`    | Dialogue scripts (DSL) |
| `interludes/` | `.yaml`   | Interlude definitions  |
| `items/`      | `.yaml`   | Item definitions       |
| `journal/`    | `.yaml`   | Journal entries        |
| `locales/`    | `.yaml`   | Translation strings    |
| `locations/`  | `.yaml`   | Location definitions   |
| `maps/`       | `.yaml`   | Map definitions        |
| `quests/`     | `.yaml`   | Quest definitions      |

### game.yaml

The root configuration file. Required fields:

```yaml
startLocation: tavern # Where the player begins
startTime:
    day: 1
    hour: 8
startFlags: {} # Initial boolean flags
startVariables: # Initial numeric/string variables
    gold: 100
startInventory: [] # Item IDs the player starts with
```

### Locale Files

Locale files are flat key-value YAML dictionaries. They're loaded by filename: `en.yaml` becomes locale `"en"`, `es.yaml` becomes `"es"`.

```yaml
# content/locales/en.yaml
location.tavern.name: 'The Rusty Tankard'
character.bartender.name: 'Greta'
```

Referenced anywhere with `@key` syntax:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
```

## Assets Directory

Static files referenced by content:

- **images/**: location banners (`banner` field), character portraits (`portrait`), item icons/images, interlude images
- **audio/**: music tracks, ambient sounds, game sound effects, UI sounds, and voice lines
- **video/**: video files used by dialogue `VIDEO` effects

Content files usually use bare filenames. The engine resolves them by field type, such as `banner: tavern.png` to `/assets/images/banners/tavern.png`. Shell config in `game.yaml` uses full `/assets/...` paths.

## Source Directory

Your application code. The scaffolder creates a minimal setup:

- **main.tsx**: mounts the React app
- **App.tsx**: fetches content and the asset manifest, then renders either `GameShell` or your custom renderer providers
- **index.css**: default styles (fully customizable)

For custom renderers, replace `GameRenderer` with your own components using the `useGame` hook. See [Custom Renderer](/technical/custom-renderer/).
