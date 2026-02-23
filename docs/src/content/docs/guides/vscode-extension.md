---
title: VS Code Extension
description: Syntax highlighting for .dlg dialogue files in VS Code.
---

The Doodle Engine VS Code extension adds syntax highlighting for `.dlg` dialogue files. It is included in the repository under `extensions/vscode-dlg/` and is not published to the VS Code Marketplace.

## What It Highlights

| Element | Example |
| ------- | ------- |
| Structure keywords (`NODE`, `CHOICE`, `IF`, `END`) | `NODE start` |
| Flow keywords (`TRIGGER`, `REQUIRE`, `GOTO`) | `GOTO rumors` |
| Effect keywords (`SET`, `ADD`, `REMOVE`, `MOVE`, `CLEAR`, `ADVANCE`, `START`, `ROLL`) | `ADD variable gold -5` |
| Media keywords (`MUSIC`, `SOUND`, `VOICE`, `VIDEO`, `NOTIFY`, `INTERLUDE`) | `MUSIC tension.ogg` |
| Speaker names | `BARTENDER:` |
| Condition types (`hasFlag`, `questAtStage`, `variableGreaterThan`, etc.) | `REQUIRE hasFlag metBartender` |
| Effect targets (`flag`, `variable`, `questStage`, `item`, etc.) | `SET flag seenIntro` |
| Localization keys | `@bartender.greeting` |
| Quoted strings | `"Hello, traveller!"` |
| Numbers | `-5`, `20` |
| Comments | `# This is a comment` |

The extension also enables:

- Line comment toggling with `Ctrl+/` (`Cmd+/` on macOS)
- Auto-closing double quotes

## Install

Copy the `vscode-dlg` folder into your VS Code extensions directory, naming it `doodle-engine.doodle-dlg-syntax-0.0.1`:

- **Windows**: `%USERPROFILE%\.vscode\extensions\doodle-engine.doodle-dlg-syntax-0.0.1`
- **macOS**: `~/.vscode/extensions/doodle-engine.doodle-dlg-syntax-0.0.1`
- **Linux**: `~/.vscode/extensions/doodle-engine.doodle-dlg-syntax-0.0.1`

Then restart VS Code (or run **Developer: Reload Window** from the command palette). The extension loads automatically for any file with the `.dlg` extension.
