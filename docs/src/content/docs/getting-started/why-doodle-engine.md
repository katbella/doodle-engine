---
title: Why Doodle Engine
description: When to use Doodle Engine and what problems it solves.
---

Doodle Engine is for story-rich games built around dialogue, exploration, and a world that remembers what the player has done. It supports traditional text adventures and games with the hallmarks of a classic computer RPG.

It takes inspiration from the Infinity Engine games of the late 1990s and early 2000s, especially *Baldur's Gate*, *Icewind Dale*, and *Planescape: Torment*. In those games, story is closely tied to game state. Conversations respond to the world and change it in return, allowing dialogue, exploration, and player choices to shape one another.

A Doodle game can pair that structure with rich artwork, animation, sound, video, and a custom interface. Projects can create polished visual experiences without building around real-time movement, physics, or combat.

Doodle Engine provides a focused foundation for building and shipping narrative RPGs and adventures.

## Why "Doodle"?

Doodle Engine is named after doodles, the goofy (but lovable!) family of poodle mixes. A doodle is also a freeform sketch: a place to explore an idea and see what it becomes.

Stories matter in games. When the story and game world are connected, player choices can influence both. The best stories often come from combining interesting concepts and influences. Doodle Engine grew in the same way, drawing inspiration from games and engines I have enjoyed. My goal is to bring those ideas together in a tool that feels approachable and easy to use.

## Design Philosophy

Narrative and game systems belong together. Dialogue reads and changes the same state as the rest of the game, so a conversation can depend on where the player has been and change what happens next.

Content should be approachable. Doodle Studio provides visual authoring and playtesting, and the project stays in readable files the whole time, so direct editing and version control always work.

A new project starts with useful defaults: a playable shell, established patterns for content and saving, and validation from the first minute. Each part can evolve with the game.

Presentation stays flexible because the engine keeps game state separate from the interface. Use the built-in React renderer, restyle it, or replace it entirely.

## Comparison to Other Tools

Twine, Ink, Ren'Py, and Doodle Engine can all be used to make branching narrative games. They organize the work in different ways.

### Twine

[Twine](https://twinery.org/) centers authoring on passages and links. The chosen story format defines how the finished story runs and which authoring features are available. Doodle organizes dialogue as part of a larger RPG world and its systems.

### Ink

[Ink](https://www.inklestudios.com/ink/) is a scripting language for highly branching narrative. It can power a web story or be embedded in a larger game. Doodle's dialogue format belongs to a complete narrative game project with its own world model, authoring tools, and renderer.

### Ren'Py

[Ren'Py](https://www.renpy.org/) centers visual novel creation on scenes, character sprites, dialogue, menus, and transitions. Doodle focuses on narrative RPGs and adventures, where dialogue, exploration, and persistent game systems work together.

## When to Use Doodle Engine

Doodle Engine is a good fit when dialogue, exploration, and player choice are the heart of your game, and conversations need to reflect and change a persistent world. It gives you the structure of a classic RPG without building around real-time movement or combat, lets you combine text with rich visuals, music, voice, and video, and leaves the interface and presentation under your control. Games release on web, desktop, or mobile.

Another engine may fit better if you need real-time combat, pathfinding, or physics; if you are building a visual novel centered on character sprites and scene composition; or if you want a pure hypertext tool with minimal structure.

## Who Is It For

Doodle works for solo creators wearing several hats and for teams where each person contributes a different part. Writers and narrative designers create the dialogue, characters, quests, and branching stories. Game designers shape locations, progression, inventory, relationships, and world state. Programmers extend the game and its presentation with TypeScript and web technologies, while artists and audio creators supply the portraits, backgrounds, music, voice, and video the game uses. The readable project structure also makes it a practical teaching tool for narrative game development.

Ready to try it? [Studio or CLI?](/getting-started/studio-or-cli/) helps you pick a way of working, and [Installation](/getting-started/installation/) gets you to a running game.
