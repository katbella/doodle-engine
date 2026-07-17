---
title: Why Doodle Engine
description: When to use Doodle Engine and what problems it solves.
---

## The Idea Behind Doodle Engine

Doodle Engine is for story-rich games built around dialogue, exploration, and a world that remembers what the player has done. It supports traditional text adventures and games with the hallmarks of a classic computer RPG.

It takes inspiration from the Infinity Engine games of the late 1990s and early 2000s, especially *Baldur's Gate*, *Icewind Dale*, and *Planescape: Torment*. In those games, story is closely tied to game state. Conversations respond to the world and change it in return, allowing dialogue, exploration, and player choices to shape one another.

A Doodle game can pair that structure with rich artwork, animation, sound, video, and a custom interface. Projects can create polished visual experiences without building around real-time movement, physics, or combat.

Doodle Engine provides a focused foundation for building and shipping narrative RPGs and adventures.

## Why "Doodle"?

Doodle Engine is named after doodles, the goofy (but lovable!) family of poodle mixes. A doodle is also a freeform sketch: a place to explore an idea and see what it becomes.

Stories matter in games. When the story and game world are connected, player choices can influence both. The best stories often come from combining interesting concepts and influences. Doodle Engine grew in the same way, drawing inspiration from games and engines I have enjoyed. My goal is to bring those ideas together in a tool that feels approachable and easy to use.

## Design Philosophy

Doodle Engine follows four practical principles:

- **Narrative and game systems belong together.** Dialogue reads and changes the same state as the rest of the game.
- **Content should be approachable.** Doodle Studio provides visual authoring and playtesting, and the project remains in readable files for direct editing and version control.
- **Projects should start with useful defaults.** A new project includes a playable shell and established patterns for content, saving, and validation. Each part can evolve with the game.
- **Presentation should stay flexible.** The engine keeps game state separate from the interface. You can use the built-in React renderer, customize it, or create your own.

## Comparison to Other Tools

Twine, Ink, Ren'Py, and Doodle Engine can all be used to make branching narrative games. They organize the work in different ways.

### Twine

[Twine](https://twinery.org/) centers authoring on passages and links. The chosen story format defines how the finished story runs and which authoring features are available. Doodle organizes dialogue as part of a larger RPG world and its systems.

### Ink

[Ink](https://www.inklestudios.com/ink/) is a scripting language for highly branching narrative. It can power a web story or be embedded in a larger game. Doodle's dialogue format belongs to a complete narrative game project with its own world model, authoring tools, and renderer.

### Ren'Py

[Ren'Py](https://www.renpy.org/) centers visual novel creation on scenes, character sprites, dialogue, menus, and transitions. Doodle focuses on narrative RPGs and adventures, where dialogue, exploration, and persistent game systems work together.

## When to Use Doodle Engine

Doodle Engine is a good fit when:

- Dialogue, exploration, and player choice are central to the game
- Conversations need to reflect and change a persistent world
- You want the structure of a classic RPG without building the game around real-time movement or combat
- You want to combine text with rich visuals, music, voice, and video
- You want a visual workspace for building and playtesting the game
- You want control over the game's interface and visual presentation
- You plan to release the game on web, desktop, or mobile

Another engine may fit better when:

- You need **real-time combat**, **pathfinding**, or **physics**
- You are building a **visual novel** centered on character sprites and scene composition
- You want a **pure hypertext** tool with minimal structure

## Who Is It For

Doodle supports solo creators working across several disciplines and teams whose members contribute different parts of the game.

- **Writers and narrative designers** can create dialogue, characters, quests, and branching stories.
- **Game designers** can shape locations, progression, inventory, relationships, and world state.
- **Programmers** can extend the game and its presentation with TypeScript and web technologies.
- **Visual artists and audio creators** can provide the portraits, backgrounds, music, voice, sound, and video used by the game.
- **Educators and students** can use the project structure to teach or learn narrative game development.
