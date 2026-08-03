---
title: Installation
description: Set up Doodle Studio, the command-line tools, or both.
---

There are two ways to create and work on a Doodle Engine game, and both produce the same kind of project:

- **Doodle Studio** is the desktop editor. Install it when you want to work in Visual mode or Source mode and test dialogue inside the app.
- **The command line** creates and runs projects from a terminal, and you edit the files in your own code editor.

You can set up either one now and add the other later. Both work on the same project folder. If you are not sure which suits you, read [Studio or CLI?](/getting-started/studio-or-cli/) first.

## Doodle Studio setup

1. Download the installer for your operating system from the [latest Doodle Studio release](https://github.com/katbella/doodle-engine/releases/latest): the `.exe` installer on Windows, or the `.dmg` on macOS.
2. On Windows, run the installer, then launch **Doodle Studio** from the Start menu or desktop shortcut. On macOS, open the `.dmg` and drag Doodle Studio into the Applications folder, then launch it from Applications.

:::caution[First launch may be blocked]
Doodle Studio installers are not yet code-signed, so Windows SmartScreen or macOS Gatekeeper may block the first launch. Only use an installer downloaded from the release page linked above.

On Windows, review the filename and source in the SmartScreen message before choosing to run the installer. On macOS, try to open Doodle Studio once, then open **System Settings**, select **Privacy & Security**, and choose **Open Anyway** for Doodle Studio. Apple makes this option available for about an hour after the blocked launch.
:::

Studio can create and edit projects on its own. Preview and Build use the project's Node.js packages, so install [Node.js 24 or newer](https://nodejs.org/) before using those actions.

## Command-line setup

Install [Node.js 24 or newer](https://nodejs.org/). Node.js includes npm, which runs the Doodle Engine project commands. Yarn and pnpm also work if you already use one of them.

You also need a text editor. Any editor can work with Doodle Engine files. [VS Code](https://code.visualstudio.com/) can also use the Doodle Engine extension for dialogue syntax highlighting and suggestions.

Open a terminal and check that Node.js and npm are available:

```bash
node --version
npm --version
```

Both commands should print a version number. If the terminal cannot find either command, close and reopen it after installing Node.js.

## Create your first project

Continue with [Your First Game](/getting-started/your-first-game/). It creates the same starter project in Doodle Studio or from the terminal, then explains how that project works before the documentation separates into editor-specific workflows.
