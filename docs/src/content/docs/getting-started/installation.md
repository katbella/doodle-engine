---
title: Installation
description: Install Doodle Studio and use the command-line tools in a game project.
---

Install Doodle Studio to create a game project. Every new project also includes command-line tools for running, checking, and building the game.

[Compare Doodle Studio and the CLI](/getting-started/studio-or-cli/)

## Doodle Studio setup

Doodle Studio is the visual desktop editor and the recommended starting point for a first game.

1. Download the current Doodle Studio installer from the [Doodle Engine releases](https://github.com/katbella/doodle-engine/releases) page.
2. Run the installer, then launch **Doodle Studio** from the Start menu or desktop shortcut.
3. Select **New project…**, name the project and game, and choose where to create it.
4. Keep **Playable example story** selected and choose **English text with a locale starter file**.
5. Keep the default React renderer and starter styles selected, then select **Create**.

The generated game uses Node.js packages for Preview and Build. Install [Node.js 24 or newer](https://nodejs.org/) before using those commands. When Studio displays the dependency banner in a new project, select **Install dependencies**.

[Continue with the Doodle Studio walkthrough](/studio/)

## Command-line setup

To use the command line with a project created in Studio, install:

- **Node.js 24 or newer** from [nodejs.org](https://nodejs.org/)
- **npm**, which is included with Node.js. Yarn and pnpm also work
- **A code editor** such as [VS Code](https://code.visualstudio.com/)

Open a terminal in the project folder, then install its dependencies and start the game:

```bash
npm install       # or: yarn install / pnpm install
npm run dev       # or: yarn dev / pnpm dev
```

Your game is running at `http://localhost:3000`.

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
