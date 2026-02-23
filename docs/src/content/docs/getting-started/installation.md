---
title: Installation
description: How to create a new Doodle Engine game project.
---

## Requirements

- **Node.js 24+**: Get it at [nodejs.org](https://nodejs.org/).
- **npm**: Comes with Node.js. yarn and pnpm also work.
- **A code editor**: [VS Code](https://code.visualstudio.com/) works well.

## How It Works

Doodle Engine games run in a web browser. Running `npm run dev` starts a local server at `http://localhost:3000`. You cannot open `index.html` directly as a file. It needs to be served.

When you build for release (`npm run build`), you get a `dist/` folder with static files. Upload it to any web host. No server-side software is required.

For desktop or mobile distribution, you can wrap the build using standard web wrapping tools.

## Quick Start

The scaffolder creates a complete, ready-to-run project with all source files, configuration, and starter game content included.

```bash
npx @doodle-engine/cli create my-game
```

It will ask one question: whether to use the batteries-included `GameShell` renderer or start with a custom setup.

Then install and run:

```bash
cd my-game
npm install       # or: yarn install / pnpm install
npm run dev       # or: yarn dev / pnpm dev
```

Your game is running at `http://localhost:3000`.

## Next Steps

- [Project Structure](/getting-started/project-structure/) - what the scaffolder created
- [Your First Game](/getting-started/your-first-game/) - walkthrough of the starter content
- [Custom Renderer](/guides/custom-renderer/) - using individual components or building your own UI