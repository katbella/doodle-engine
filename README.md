<!-- TODO: Add project logo/banner here -->
<!-- <p align="center"><img src="docs/public/logo.png" alt="Doodle Engine" width="400" /></p> -->

<h1 align="center">Doodle Engine</h1>

<p align="center">An RPG/adventure engine for text-based, story-driven games.</p>

---

## About

Inspired by the Infinity Engine (the engine powering games like Baldur's Gate 1 and 2, Icewind Dale 1 and 2, and Planescape: Torment), Doodle Engine is for creators who want a story-first approach to games that can be extended. Write branching dialogue, quests, and world content in YAML and a simple DSL (domain-specific language). No code required for authoring. Plug in the included React renderer or build your own UI with the framework-agnostic core.

## Features

- **Pure TypeScript core**: no UI dependencies, works with any framework
- **React renderer included**: batteries-included components or build your own
- **Dialogue DSL**: write branching conversations in `.dlg` files with conditions and effects
- **YAML content**: locations, characters, items, quests, maps, and journal entries
- **Built-in localization**: multi-language support with `@key` references
- **Quest and journal system**: multi-stage quests with journal tracking
- **Character relationships and party**: relationship values, party management, character stats
- **Inventory system**: items with locations, pickup, and inspection
- **Save/load support**: serialize and restore full game state
- **Audio system**: background music, sound effects, voice lines with crossfade
- **Video cutscenes**: fullscreen video playback triggered from dialogue
- **UI sounds**: click, menu open/close sounds for renderer chrome
- **Game shell**: splash screen, title screen, pause menu, settings panel
- **Hot reload**: Vite dev server watches content files and reloads instantly
- **CLI tools**: scaffold new projects, dev server, production builds
- **Extensible by design**: build custom renderers with any framework, compose built-in conditions and effects to create mechanics like dice rolls, text-based combat, or shops

## Extensibility

Doodle Engine doesn't ship with every possible game mechanic out of the box, but its building blocks are designed to be composed. The 25 built-in effects (flags, variables, items, quests, relationships, etc.) and 14 conditions can be combined to create mechanics the engine doesn't explicitly define, like text-based combat, dice rolls, skill checks, or shop systems. The core has no UI dependencies, so you can build a renderer with React, Vue, Svelte, or plain JavaScript. See the [Extending the Engine](docs/src/content/docs/guides/extending-the-engine.md) guide for examples.

## Quick Start

```bash
npx create-doodle-engine-game my-game
cd my-game
npm install       # or: yarn install / pnpm install
npm run dev        # or: yarn dev / pnpm dev
```

Open `http://localhost:3000` to play your game.

## Packages

| Package | Description |
|---------|-------------|
| `@doodle-engine/core` | Pure TypeScript engine: parsing, state, conditions, effects, snapshots |
| `@doodle-engine/react` | React 19 components: GameShell, GameRenderer, individual components, hooks |
| `@doodle-engine/cli` | Dev tools: `doodle dev`, `doodle build`, project scaffolding |

## Documentation

Full documentation is available in the `docs/` directory. To run locally:

```bash
cd docs
yarn install
yarn dev
```

### Key Pages

- [Installation](docs/src/content/docs/getting-started/installation.md)
- [Your First Game](docs/src/content/docs/getting-started/your-first-game.md)
- [Writing Dialogues](docs/src/content/docs/guides/writing-dialogues.md)
- [DSL Syntax Reference](docs/src/content/docs/reference/dsl-syntax.md)
- [Effects Reference](docs/src/content/docs/reference/effects.md)
- [React Components](docs/src/content/docs/reference/react-components.md)

## Project Structure

```
packages/
  core/       # Engine: parsing, state management, conditions, effects
  react/      # React renderer: components, hooks, GameShell
  cli/        # CLI tools: dev server, scaffolding, builds
docs/         # Starlight documentation site
```

## Requirements

- Node.js 24+
- TypeScript 5.7+

## License

MIT
