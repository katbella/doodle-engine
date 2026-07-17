---
title: Project Structure
description: How the project files shared by Doodle Studio and the CLI are organized.
---

Each Doodle game lives in a folder containing its content, media, and application. Studio works with these files through visual tools, and the CLI runs commands against the folder. You can also open the files directly in a code editor.

Knowing where things are is helpful when adding files by hand, using version control, automating validation and builds, or customizing the game's renderer.

A game project has this structure:

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

All game content lives in `content/`. The engine loads each type from its corresponding directory:

| Directory     | File Type | Contains                         |
| ------------- | --------- | -------------------------------- |
| `characters/` | `.yaml`   | Character definitions            |
| `dialogues/`  | `.dlg`    | Dialogue scripts                 |
| `interludes/` | `.yaml`   | Interlude definitions            |
| `items/`      | `.yaml`   | Item definitions                 |
| `journal/`    | `.yaml`   | Journal entries                  |
| `locales/`    | `.yaml`   | Translation strings              |
| `locations/`  | `.yaml`   | Location definitions             |
| `maps/`       | `.yaml`   | Map definitions                  |
| `quests/`     | `.yaml`   | Quest definitions                |

### game.yaml

`game.yaml` sets the starting location, time, flags, variables, and inventory. Its required fields are:

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

Each entry in a locale file pairs a localization key with the text to display in that language. The filename sets the locale code: `en.yaml` becomes `"en"`, and `es.yaml` becomes `"es"`.

```yaml
# content/locales/en.yaml
location.tavern.name: 'The Rusty Tankard'
character.bartender.name: 'Greta'
```

Use the key in another content file by adding `@` before it:

```yaml
# content/locations/tavern.yaml
id: tavern
name: '@location.tavern.name'
```

## Assets Directory

The `assets/` directory contains the images, audio, and video used by the game. Studio can import a file and copy it into the appropriate folder, or you can place files there directly:

- **images/**: location banners (`banner` field), character portraits (`portrait`), item icons/images, interlude images
- **audio/**: music tracks, ambient sounds, game sound effects, UI sounds, and voice lines
- **video/**: video files played by dialogue `VIDEO` effects or custom renderer code

Content files usually use bare filenames. The engine uses the field to find the correct folder, such as `banner: tavern.png` in `assets/images/banners/`. Shell config in `game.yaml` uses project-relative paths beginning with `assets/`.

## Source Directory

The `src/` directory contains the game application. Studio uses this application when you select Preview or Build. Edit these files to customize the renderer and the rest of the interface.

- **main.tsx**: mounts the React app
- **App.tsx**: fetches the content registry (loaded game definitions) and asset manifest (media list), then renders `GameShell` or your custom renderer providers
- **index.css**: styles for the game interface

For custom renderers, replace `GameRenderer` with your own components. The `useGame` React hook gives those components the current game screen and player actions. See [Custom Renderer](/technical/custom-renderer/).

## Where to continue

- [The Studio Workspace](/studio/workspace/) explains how Studio presents project content
- [Assets in Studio](/studio/assets/) shows how to import media into these folders
- [CLI Commands](/reference/cli-commands/) covers development, validation, and production builds
- [Architecture](/technical/architecture/) explains how the packages and application fit together
