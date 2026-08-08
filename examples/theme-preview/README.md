# Theme Preview

A narrative game built with [Doodle Engine](https://doodleengine.dev).

## Working on the game

This project uses the `@doodle-engine/*` packages in this repository, not their published versions. Run its commands from the repository root so the local packages are built first.

Install once, then start the development server:

```bash
yarn install
yarn example
```

The game opens at http://localhost:3000 and reloads whenever a content file changes. Content errors appear in the terminal as you save.

Other commands:

```bash
yarn workspace theme-preview run validate   # check content for errors
yarn build                                  # build the repository and example
yarn workspace theme-preview run preview    # serve the finished build locally
yarn workspace theme-preview run typecheck  # check the game's TypeScript
yarn example:theme prose                    # change the renderer theme
```

## Where things live

- `content/` holds the story: locations, characters, dialogues (`.dlg` files), quests, and the game configuration.
- `assets/` holds images, audio, and video.
- `src/` is the game's interface code.
- `src/renderer-overrides.css` holds theme customizations that remain in place when you change themes.

The [Doodle Engine documentation](https://doodleengine.dev) covers everything from writing dialogue to publishing. This project also opens in [Doodle Studio](https://doodleengine.dev/studio/), the visual editor; Studio and direct file editing work on the same files.

## Dialogue highlighting in VS Code

A syntax highlighting extension for `.dlg` files ships with this project. In VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), run **Extensions: Install from VSIX...**, and select `node_modules/@doodle-engine/cli/extensions/doodle-dlg-syntax.vsix`.
