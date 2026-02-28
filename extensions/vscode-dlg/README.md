# Doodle DLG Syntax (VS Code)

VS Code syntax highlighting for `.dlg` dialogue files used by [Doodle Engine](https://github.com/katbella/doodle-engine).

## Installation

The extension is bundled with the `@doodle-engine/cli` npm package — it is not published to the VS Code Marketplace.

After running `npm install` (or `yarn`/`pnpm`) in your Doodle Engine project:

1. Open VS Code
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run **Extensions: Install from VSIX...**
4. Navigate to `node_modules/@doodle-engine/cli/extensions/doodle-dlg-syntax-1.0.0.vsix` in your project

Then reload VS Code. The extension activates automatically for `.dlg` files.

> **Note:** The `.vsix` file is committed to the repository as a build artifact. It only needs to be rebuilt when the grammar changes (`npx @vscode/vsce package --no-dependencies` in this directory).

## What It Highlights

- Structure keywords: `NODE`, `CHOICE`, `IF`, `END`
- Flow keywords: `GOTO`, `TRIGGER`, `REQUIRE`
- Effect keywords: `SET`, `ADD`, `REMOVE`, `MOVE`, `CLEAR`, `ADVANCE`, `START`, `ROLL`
- Media keywords: `MUSIC`, `SOUND`, `VOICE`, `VIDEO`, `NOTIFY`, `INTERLUDE`
- Speaker names (`BARTENDER:`)
- Condition types (`hasFlag`, `questAtStage`, `variableGreaterThan`, etc.)
- Effect targets (`flag`, `variable`, `questStage`, `item`, etc.)
- Localization keys (`@bartender.greeting`)
- Quoted strings, numbers, and `#` comments

Also enables line comment toggling (`Ctrl+/` / `Cmd+/`) and auto-closing quotes.
