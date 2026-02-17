---
title: Why Doodle Engine
description: How Doodle Engine compares to other narrative tools and when to use it.
---

## Philosophy

Doodle Engine is built for story-driven games where dialogue and world state matter more than movement or combat.

Game authors write content in YAML and a simple dialogue DSL. Developers extend the engine and build renderers in TypeScript. Writers work in text files. Programmers work in code. Both can move forward without blocking each other.

The engine supports visual presentation elements such as image banners, video, and narrative interludes with scrolling text, allowing games to mix prose with structured scenes and transitions.

Games built with Doodle Engine can be shipped as standalone titles. Projects commonly run in the browser during development and are packaged for desktop using Electron, Tauri, or similar tools.

The goal is to make narrative games easier to build without locking projects into a specific ruleset, genre, or visual style.

## Comparison to Other Tools

### vs Twine

[Twine](https://twinery.org/) is excellent for hypertext fiction: stories told through linked passages. Doodle Engine is aimed at games with persistent state and world structure, such as locations, inventory, and quests.

| | Twine | Doodle Engine |
|---|---|---|
| Content format | HTML passages | YAML + dialogue DSL |
| State management | Macros and variables | Structured game state with conditions and effects |
| Output | Self-contained HTML | Browser and desktop builds |
| Best for | Branching text stories | Story-driven RPGs with world state |

### vs Ink

[Ink](https://www.inklestudios.com/ink/) is a strong language for branching dialogue and narrative flow. It assumes you will provide the surrounding game systems yourself.

Doodle Engine includes those systems so dialogue, inventory, quests, and world state are part of the same model.

| | Ink | Doodle Engine |
|---|---|---|
| Content format | Ink scripting language | YAML + dialogue DSL |
| Game systems | Provided by your engine | Built-in (inventory, quests, maps, journal) |
| Renderer | Bring your own | Included (React) or custom |
| Best for | Dialogue inside an existing game engine | Complete story-driven RPGs |

### vs Ren'Py

[Ren'Py](https://www.renpy.org/) is a visual novel engine with a Python-based scripting language and a renderer designed around sprites, backgrounds, and scene composition.

Doodle Engine focuses on text-driven games and leaves presentation entirely to the renderer.

| | Ren'Py | Doodle Engine |
|---|---|---|
| Language | Python + Ren'Py script | TypeScript + YAML + DSL |
| Platform | Desktop | Browser and desktop (Electron, Tauri) |
| Visual style | Visual novel presentation | Text-driven with optional images, video, and interludes |
| Game systems | Visual novel focused | RPG-oriented (quests, inventory, maps, party) |
| Best for | Visual novels | Text-based RPGs and adventure games |

## When to Use Doodle Engine

Doodle Engine is a good fit when:

- You are building a **text-based RPG** with dialogue, quests, and inventory  
- You want to **separate content from code** so writers and programmers can work independently  
- You want to build a **complete narrative game** that can ship on Steam or itch.io  
- You want a development workflow that runs in the browser but packages to desktop  
- You want to present story moments using **images, video, or narrative interludes** alongside dialogue  
- You want to **control the UI** with CSS or build your own renderer  
- You need **localization** built in from the start  
- You want **hot reload** while writing and testing content  

Doodle Engine is not a good fit when:

- You need **real-time combat**, **pathfinding**, or **physics**  
- You are building a **visual novel** centered on character sprites and scene composition  
- You want a **pure hypertext** tool with minimal structure  
- You want to write everything in a **single scripting language** without external data files  

## Who Is It For

- **Writers** who want to build narrative games without writing code  
- **Interactive fiction authors** who need inventory, quests, and world state  
- **Web developers** who want to build narrative games with familiar tools  
- **Game jam teams** that need scaffolding and fast iteration  
- **Educators** teaching narrative design or game development
