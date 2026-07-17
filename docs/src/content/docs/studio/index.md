---
title: Doodle Studio
description: Build, inspect, and playtest Doodle Engine projects in the desktop editor.
---

Doodle Studio is the desktop app for creating a Doodle Engine game. Use it to create a project, write and organize game content, import assets, test story paths, preview the game as players will see it, and build the files you will publish.

[![Doodle Studio welcome screen](/images/studio/welcome.png)](/images/studio/welcome.png)

## Start Studio

[Install Doodle Studio](/getting-started/installation/#doodle-studio-setup) if you have not set it up yet. Then launch it from your applications or Start menu.

The Welcome screen provides three starting points:

- **New project…** creates a new playable game project.
- **Open project…** opens an existing Doodle Engine project folder.
- **Recent Projects** lists the projects you have used before.

The question-mark button in the upper-right corner opens this Studio guide.

## Make your first game

For your first game, write the English text directly in Studio. You will see the exact words that appear in the game, and you can introduce translation keys later when you need them.

1. Select **New project…** and enter a project name and game title.
2. Choose **English text with a locale starter file**.
3. Keep the default renderer and starter styles selected, choose where to save the project, and select **Create**.
4. Under **Dialogues** in the project rail, open `bartender_greeting`.
5. Select the `start` node and change the bartender’s line.
6. Select **Playtest**, choose **Start at node…**, and select the `start` node in `bartender_greeting`.
7. Select **Preview** to play the game in its renderer.
8. Select **Build** when you are ready to create the files you will publish.

[![A project open in the Doodle Studio workspace](/images/studio/workspace.png)](/images/studio/workspace.png)

## What each part of Studio does

| Area | Position | Purpose |
| --- | --- | --- |
| Top bar | Top | Provides common project and testing actions. |
| Project rail | Left | Opens and organizes game content. |
| Editor | Center | Provides visual controls and direct file editing. |
| References panel | Right | Shows where the selected item is used. |
| Bottom dock | Bottom | Holds project checks, output, state tools, and the playtester. |

## Continue learning

- [Create and open projects](/studio/projects/)
- [Learn the workspace](/studio/workspace/)
- [Write dialogue visually](/studio/dialogues/)
- [Test story paths and state](/studio/playtesting/)
- [Import images, audio, and video](/studio/assets/)
- [Add localization when your game is ready for another language](/studio/localization/)
- [Validate, preview, and build](/studio/validation-builds/)

Use [Writing Dialogues](/guides/writing-dialogues/) to learn the dialogue language. The Studio dialogue guide explains the visual controls for writing the same content.
