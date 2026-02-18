<h1 align="center">Doodle Engine</h1>

<p align="center">A dialogue-driven engine for RPGs and narrative adventure games.</p>

---

## About

Doodle Engine is an engine for building text-driven RPGs and adventure games. It focuses on dialogue, narrative flow, and world state rather than movement, combat, or pathfinding.

It is inspired by how the Infinity Engine handled dialogue and scripting, but it is not tied to any specific ruleset or genre. The goal is to give writers and programmers a flexible foundation for story-heavy games.

The engine manages dialogue, quests, inventory, characters, relationships, locations, journal entries, save/load, audio, video cutscenes, and localization.

---

## For Writers

Games are written in plain text and YAML. No programming is required to build story content.

- Dialogue written in a readable script format with speakers, choices, branching, conditions, and effects
- World data in YAML: locations, characters, items, quests, and journal entries
- Conditions based on flags, variables, items, quest stages, relationships, and time of day
- Dice rolls for skill checks and random outcomes
- Narrative interludes for chapter screens, dream sequences, and story moments
- Localization using translation keys and locale files
- Hot reload while writing
- Validation that catches missing references and structural errors before you play

The focus is on letting writers iterate quickly.

---

## For Developers

The engine is written in TypeScript and built around a predictable state model.

- Framework-agnostic core with no UI dependencies
- One-way data flow where actions produce snapshots and renderers display them
- React renderer with components for dialogue, choices, inventory, journal, map, and characters, plus a complete game shell
- Asset preloading so images and audio are ready before they appear
- Audio support for music, sound effects, and voice lines
- Video cutscene playback
- Dev tools exposed on `window.doodle` for testing and debugging
- CLI for project scaffolding, development, builds, and validation

The architecture is meant to stay understandable as projects grow.

---

## Extensibility

The core engine does not assume a renderer or UI framework. You can build your own renderer or replace parts of the provided one.

Effects and conditions are composable building blocks. They can be combined to create systems such as reputation, skill checks, shops, or other mechanics without changing the engine itself.

---

## Quick Start

```bash
npx @doodle-engine/cli create my-game
cd my-game
npm install
npm run dev
```

---

## Packages

| Package                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `@doodle-engine/core`  | Engine state, parsing, conditions, and effects |
| `@doodle-engine/react` | React components and hooks                     |
| `@doodle-engine/cli`   | Dev server, scaffolding, builds                |

---

## Documentation

https://katbella.github.io/doodle-engine/

---

## License

MIT
