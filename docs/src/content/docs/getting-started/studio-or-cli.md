---
title: Studio or CLI?
description: Choose between Doodle Studio, the command line, or a combination of both.
---

Doodle Studio creates the game project, and the Doodle Engine CLI provides commands that run inside it. Both work with the same files.

## Doodle Studio

Doodle Studio is the visual desktop editor. Start here if you want to concentrate on writing, worldbuilding, and testing your game.

Use Studio to:

- Create new game projects
- Write dialogue and edit characters, locations, quests, items, maps, and interludes
- Import portraits, voice lines, music, video, and other game assets
- Playtest individual story paths and inspect their state
- Preview the game in its renderer and create a release build

[Make your first project in Doodle Studio](/studio/)

## Command Line

The CLI provides terminal commands for running, validating, and building a Doodle project. Use it when you prefer editing project files in a code editor or want to automate validation and production builds.

Use the CLI to:

- Start a development server with hot reload
- Check game content for errors
- Create a production build

[Set up the CLI](/getting-started/installation/#command-line-setup)

## Use both when it helps

Create and playtest content in Studio, edit the same files in a code editor, and run validation or production builds from the terminal as needed.

## Customize the Game's Presentation

The renderer is part of your game project. Its React components and CSS determine how the finished game looks and behaves. You can restyle the built-in interface, change its components, or replace it with your own renderer. Studio Preview and production builds use the renderer in your project.

Start with [styling the Game Shell](/guides/game-shell/#styling), or learn how to [build a custom renderer](/technical/custom-renderer/).
