# @doodle-engine/core

The engine behind [Doodle Engine](https://doodleengine.dev), a narrative RPG engine for text-based, story-driven games.

This package holds the game logic and no interface code: it parses content, tracks game state, evaluates conditions, runs effects, and returns a snapshot for a renderer to display. It has no dependency on any UI framework, so you can build a game interface with whatever you like.

```bash
npm install @doodle-engine/core
```

```ts
import { Engine } from '@doodle-engine/core';

const engine = new Engine(registry);
const snapshot = engine.newGame(config);
```

Most people never install this directly. `npx doodle-engine create my-game` sets up a project with it already in place.

- [Documentation](https://doodleengine.dev)
- [Engine API](https://doodleengine.dev/reference/engine-api/)
- [Architecture](https://doodleengine.dev/technical/architecture/)
