---
title: Installation
description: Set up Doodle Studio, the command-line tools, or both.
---

There are two ways to create and work on a Doodle Engine game, and both produce the same kind of project:

- **Doodle Studio** is the visual desktop editor. Install it when you want to build your game with visual tools and built-in playtesting.
- **The command line** creates and runs projects from a terminal, and you edit the files in your own code editor.

You can set up either one now and add the other later. Both work on the same project folder. If you are not sure which suits you, read [Studio or CLI?](/getting-started/studio-or-cli/) first.

## Doodle Studio setup

1. Download the installer for your operating system from the [latest Doodle Studio release](https://github.com/katbella/doodle-engine/releases/latest): the `.exe` installer on Windows, or the `.dmg` on macOS.
2. On Windows, run the installer, then launch **Doodle Studio** from the Start menu or desktop shortcut. On macOS, open the `.dmg` and drag Doodle Studio into the Applications folder, then launch it from Applications.
3. Select **New project…**, name the project and game, and choose where to create it.
4. Keep **Playable example story** selected and choose **English text with a locale starter file**.
5. Keep the default React renderer and starter styles selected, then select **Create**.

:::caution[First launch may be blocked]
Doodle Studio installers are not yet code-signed, so Windows SmartScreen or macOS Gatekeeper may block the first launch of an installer downloaded from the releases page. See [Security prompts](/studio/updates/#security-prompts) for how to proceed safely on each platform.
:::

The generated game uses Node.js packages for Preview and Build. Install [Node.js 24 or newer](https://nodejs.org/) before using those commands. When Studio displays the dependency banner in a new project, select **Install dependencies**.

[Continue with the Doodle Studio walkthrough](/studio/)

## Command-line setup

To create and run projects from the terminal, install:

- **Node.js 24 or newer** from [nodejs.org](https://nodejs.org/)
- **npm**, which is included with Node.js. Yarn and pnpm also work
- **A code editor** such as [VS Code](https://code.visualstudio.com/)

Create a project with the `create` command. It asks the same questions as Studio's New Project window: a game title, the starting content, how text is stored, and which renderer to include.

```bash
npx doodle-engine create my-game
```

For your first project, choose **Playable example story** and **English text with a locale starter file** when the command asks.

Then install the project's dependencies and start the game:

```bash
cd my-game
npm install       # or: yarn install / pnpm install
npm run dev       # or: yarn dev / pnpm dev
```

Your game is running at `http://localhost:3000`.

This also works on a project that was created in Studio: open a terminal in the project folder and run the same `npm install` and `npm run dev` commands.

[Explore the starter project](/getting-started/your-first-game/)

## How projects run

Doodle Engine games run in a web browser. Studio Preview or `npm run dev` starts a local server for the project. Open the game through this server so the browser can load its content and assets.

Select **Build** in Studio or run `npm run build` to create a `dist/` folder of static files. You can upload that folder to a web host without server-side software. A web wrapper can package the same build for desktop or mobile distribution.

## Next Steps

- [Doodle Studio](/studio/) - create, edit, playtest, preview, and build in the visual editor
- [Your First Game](/getting-started/your-first-game/) - explore the starter game by editing its files
- [Project Structure](/getting-started/project-structure/) - understand the files shared by Studio and the CLI
- [CLI Commands](/reference/cli-commands/) - command reference for development, validation, and builds
- [Custom Renderer](/technical/custom-renderer/) - use individual components or build your own UI
