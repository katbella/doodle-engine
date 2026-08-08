# Theme Preview

A narrative game built with [Doodle Engine](https://doodleengine.dev).

## Working on the game

This project is linked to the local `@doodle-engine/*` packages in this repo, not the published npm versions, so it installs through Yarn from the repo root, not `npm install` here.

Install once from the repo root, then start the development server from this folder:

```bash
# from the repo root
yarn install

# from examples/theme-preview
npm run dev
```

The game opens at http://localhost:3000 and reloads whenever a content file changes. Content errors appear in the terminal as you save.

Other commands:

```bash
npm run validate   # check content for errors
npm run build      # create release files in dist/
npm run preview    # serve the finished build locally
npm run typecheck  # check the game's TypeScript
npm run theme -- prose  # change the default renderer theme
```

## Where things live

- `content/` holds the story: locations, characters, dialogues (`.dlg` files), quests, and the game configuration.
- `assets/` holds images, audio, and video.
- `src/` is the game's interface code.
- `src/renderer-overrides.css` holds theme customizations that remain in place when you change themes.

The [Doodle Engine documentation](https://doodleengine.dev) covers everything from writing dialogue to publishing. This project also opens in [Doodle Studio](https://doodleengine.dev/studio/), the visual editor; Studio and direct file editing work on the same files.

## Dialogue highlighting in VS Code

A syntax highlighting extension for `.dlg` files ships with this project. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), run **Extensions: Install from VSIX...**, and select `node_modules/@doodle-engine/cli/extensions/doodle-dlg-syntax.vsix`.
