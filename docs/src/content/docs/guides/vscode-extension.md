---
title: VS Code Extension
description: Syntax highlighting for .dlg dialogue files in VS Code.
---

The Doodle Engine VS Code extension adds syntax highlighting for `.dlg` dialogue files. It is distributed as a VSIX installation file with the `@doodle-engine/cli` package.

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

## Installation

The extension is bundled with the `@doodle-engine/cli` npm package. After running `npm install` (or `yarn`/`pnpm`) in your project:

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **Extensions: Install from VSIX...**
4. Open `node_modules/@doodle-engine/cli/extensions/` in your project and select the `doodle-dlg-syntax-*.vsix` file

Then reload VS Code. The extension loads automatically for any file with the `.dlg` extension.
