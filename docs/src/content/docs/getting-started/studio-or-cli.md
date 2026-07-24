---
title: Studio or CLI?
description: Choose between Doodle Studio, the command line, or a combination of both.
---

Doodle Studio and the Doodle Engine CLI work with the same project files. Studio is the desktop app for creating and testing a game. The CLI runs development, validation, and build commands from the terminal. Use either one or both.

## Doodle Studio

Doodle Studio is the desktop workspace for writing, worldbuilding, and testing your game. Add and edit content through its visual controls or built-in source editor.

Use Studio to:

- Create new game projects
- Add game content in Visual or Source mode
- Import portraits, voice lines, music, video, and other game assets
- Playtest individual story paths and inspect their state
- Preview the game in its renderer and create a release build

[Make your first project in Doodle Studio](/studio/)

### Editing in Studio

Use Visual mode for purpose-built controls, or Source mode to edit files directly with syntax highlighting and project-aware IntelliSense. Both work on the same files, so you can switch at any time.

[Read about the Studio workspace](/studio/workspace/)

## Command Line

The CLI starts the development server, validates game content, and creates production builds. Edit the project in any code editor, then run these commands from the terminal.

[Set up the CLI](/getting-started/installation/#command-line-setup)

## Use both when it helps

Studio and the CLI use the same project folder. Work in Studio, your own editor, or both; no conversion is required.

## Customize the Game's Presentation

The renderer is part of your game project. Its React components and CSS determine how the finished game looks and behaves. You can restyle the built-in interface, change its components, or replace it with your own renderer. Studio Preview and production builds use the renderer in your project.

Start with [styling the Game Shell](/guides/game-shell/#styling), or learn how to [build a custom renderer](/technical/custom-renderer/).
