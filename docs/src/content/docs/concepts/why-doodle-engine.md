---
title: Why Doodle Engine
description: How Doodle Engine compares to other narrative tools and when to use it.
---

## Philosophy

Doodle Engine takes a **story-first, author-friendly, extensible** approach to narrative games. Game authors write content in YAML and a simple dialogue DSL, so they never need to touch code. Developers build renderers and extend the engine with TypeScript.

This separation means writers and developers can work in parallel, using tools that suit their roles.

## Comparison to Other Tools

### vs Twine

[Twine](https://twinery.org/) is excellent for hypertext fiction: stories told through linked passages. Doodle Engine is for games with more structure: locations you travel between, characters you talk to, items you collect, quests you track.

| | Twine | Doodle Engine |
|---|---|---|
| Content format | HTML passages | YAML + dialogue DSL |
| State management | Macros/variables | Typed game state with conditions/effects |
| Output | Self-contained HTML | Web app (React or custom) |
| Best for | Branching text stories | Story-driven RPGs with world simulation |

### vs Ink

[Ink](https://www.inklestudios.com/ink/) (by Inkle Studios) is a scripting language for branching narratives. It's more powerful for pure dialogue but less opinionated about game structure.

| | Ink | Doodle Engine |
|---|---|---|
| Content format | Ink scripting language | YAML + dialogue DSL |
| Game systems | Bring your own | Built-in (inventory, quests, maps, etc.) |
| Renderer | Bring your own | Included (React) or custom |
| Best for | Dialogue-heavy games embedded in a larger engine | Complete story-driven RPGs |

### vs Ren'Py

[Ren'Py](https://www.renpy.org/) is a visual novel engine with its own Python-based scripting language and renderer.

| | Ren'Py | Doodle Engine |
|---|---|---|
| Language | Python + Ren'Py script | TypeScript + YAML + DSL |
| Platform | Desktop (Python) | Web (browser, Electron, Tauri) |
| Visual style | Visual novel (sprites + backgrounds) | Text-based (fully customizable via CSS/React) |
| Game systems | Visual novel focused | RPG focused (quests, inventory, maps, party) |
| Best for | Visual novels | Text-based RPGs and adventure games |

## When to Use Doodle Engine

Doodle Engine is a good fit when:

- You want a **text-based RPG** with branching dialogue, quests, and inventory
- You want to **separate content from code** so writers work in YAML/DSL and developers work in TypeScript
- You want a **web-first** game that runs in the browser (or wraps to desktop)
- You want to **customize the UI** with CSS or build an entirely custom renderer
- You need **localization** built in from the start
- You want **hot reload** during development: change a dialogue file, see it instantly

Doodle Engine is not the best fit when:

- You need **real-time combat**, **pathfinding**, or **physics**. Doodle Engine is a narrative game engine, not a real-time simulation engine
- You want a **visual novel** with character sprites and scene composition. Ren'Py is better suited for that
- You need a **pure hypertext** tool. Twine is simpler for that use case
- You want to write everything in a **single scripting language**. Ink gives you more expressive power for pure dialogue

## Who Is It For

- **Game authors** who want to write stories without coding
- **Interactive fiction writers** who need more game systems than Twine provides
- **Web developers** who want to build narrative games with familiar tools (TypeScript, React, Vite)
- **Game jam participants** who want rapid scaffolding and hot reload
- **Educators** teaching narrative design or game development
