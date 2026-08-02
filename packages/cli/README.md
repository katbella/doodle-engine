# @doodle-engine/cli

The command line for [Doodle Engine](https://doodleengine.dev), a narrative RPG engine for text-based, story-driven games.

Create a game:

```bash
npx doodle-engine create my-game
cd my-game
npm install
npm run dev
```

Your game opens at `http://localhost:3000` and reloads as you edit its content.

Every project installs this package, and its commands run through the project's npm scripts:

| Script             | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Starts the development server with hot reload |
| `npm run validate` | Checks game content for errors                |
| `npm run build`    | Creates release files in `dist/`              |
| `npm run preview`  | Serves a finished build locally               |

A syntax highlighting extension for `.dlg` dialogue files ships with this package, in `extensions/doodle-dlg-syntax.vsix`.

- [Documentation](https://doodleengine.dev)
- [CLI Commands](https://doodleengine.dev/reference/cli-commands/)
- [Installation](https://doodleengine.dev/getting-started/installation/)
