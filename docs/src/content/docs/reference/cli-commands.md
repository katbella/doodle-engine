---
title: CLI Commands
description: Reference for the Doodle Engine command-line tools.
---

Doodle Engine's command-line tools come from the `@doodle-engine/cli` package, which every project includes as a development dependency. You never invoke that package by name except once, to create a project. Inside a project, each tool runs as an npm script:

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run validate` checks the game content
- `npm run preview` serves a finished build locally
- `npm run typecheck` checks the game's TypeScript

## npx doodle-engine create

Create a game project in the current folder:

```bash
npx doodle-engine create my-game
```

This is the one command that runs outside a project. `doodle-engine` is a small npm package that launches the Doodle Engine CLI, so the command works with nothing installed beyond Node.js. The command asks the same questions as Studio's New Project window, with the same option names:

- **Playable example story** creates a small connected game you can explore and replace piece by piece.
- **Minimal project with one starting location** leaves the other content sections ready for your work.

You will also choose how the project stores text: **English text with a locale starter file** writes English directly in the content, and **English and Swedish localization example** demonstrates translation keys. Either localization choice works with either starting-content choice.

The **default React renderer** provides a ready-to-use React interface that can be customized later. If you select it, you can also include the starter styles.

When it finishes, follow the printed next steps:

```bash
cd my-game
npm install
npm run dev
```

## npm run dev

Start the development server with content hot-reload.

```bash
npm run dev
```

### What it does

1. Starts a Vite dev server on port 3000
2. Loads all content from `content/` directory
3. Parses `.yaml` files as entities and `.dlg` files as dialogues
4. Serves content via the `/api/content` endpoint as JSON
5. Generates the asset manifest for each request and serves it at `/api/manifest`
6. Watches `content/**/*` for changes using chokidar
7. **Validates content on every file change** and prints errors to the terminal
8. Triggers full page reload when content files change
9. Serves the app in development mode. Generated apps pass `devTools={import.meta.env.DEV}`, which exposes `window.doodle` while the game is running.

### Content and validation

The server loads the project files into the registry served by `/api/content`. [Content Registry](/technical/content-registry/#how-content-is-loaded) documents how each directory and special file is represented.

When content changes, the server runs the same checks as `npm run validate`. Problems appear in the terminal without stopping the server. See [Content Validation](/guides/content-validation/#what-gets-validated) for the complete set of checks and example fixes.

### Browser dev tools

Generated applications expose `window.doodle` while the development build is running and omit it from production builds. [Debugging with Dev Tools](/technical/debugging-with-devtools/) lists the commands and shows how to prepare test state in the browser console.

---

## npm run build

Build the game for production.

```bash
npm run build
```

### What it does

1. **Validates all content first** and fails if errors are found
2. Generates the asset manifest and fails if referenced local assets under `assets/` are missing
3. Runs a Vite production build with relative URLs, so the output works at a domain root or hosted under a folder
4. Outputs to `dist/` directory
5. Copies project assets to `dist/assets/`
6. Builds with Vite production settings. Generated applications omit `window.doodle` from production builds.
7. **Writes `dist/asset-manifest.json`** listing all game assets with types, sizes, and tiers
8. **Generates `dist/sw.js`**, a service worker that caches the app, the content, and the assets, so the game keeps working offline after the first visit
9. Writes manifest to `dist/api/manifest` so `npm run preview` can serve it

Validation errors stop the build and return exit code 1. The terminal displays each error to fix before building again.

---

## npm run preview

Serve the finished build from `dist/` locally, so you can check it before uploading:

```bash
npm run preview
```

Run it after `npm run build`.

---

## npm run validate

Validate all game content without building or running the dev server.

```bash
npm run validate
```

### What it validates

The command checks file syntax and required fields, IDs, dialogue routes, conditions and effects, references between content, maps, and localization keys. [Content Validation](/guides/content-validation/#what-gets-validated) is the authoritative list of checks and explains where asset-file checks differ.

### Exit codes

- **0**: No validation errors found
- **1**: Validation errors found

### Example output

```text
🐾 Validating Doodle Engine content...

✓ No validation errors
```

Or with errors:

```text
🐾 Validating Doodle Engine content...

✗ Found 3 validation errors:

content/dialogues/bartender_greeting.dlg
  Node "greet" GOTO "continue" points to non-existent node
  Add NODE continue or fix the GOTO target

content/dialogues/bartender_greeting.dlg
  Node "ask_rumors" condition "hasFlag" missing required "flag" argument

content/characters/merchant.yaml
  Character "merchant" references non-existent dialogue "merchant_chat"
  Create dialogue "merchant_chat" or fix the reference
```

### When to use

- **Before committing**: Validate content changes before pushing to version control
- **Continuous integration (CI)**: Add `npm run validate` to an automated check for pushed changes
- **Manual testing**: Run validation without starting the full dev server
