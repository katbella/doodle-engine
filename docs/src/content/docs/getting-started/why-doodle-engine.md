---
title: Why Doodle Engine
description: What Doodle Engine is for, when it fits, and how it compares to other narrative tools.
---

Doodle Engine is for story-rich games built around dialogue, exploration, and a world that remembers what the player has done. You can use it to make a classic text adventure or a narrative RPG.

It takes inspiration from the Infinity Engine games of the late 1990s and early 2000s, especially *Baldur's Gate*, *Icewind Dale*, and *Planescape: Torment*. In those games the story is tied to game state. Conversations react to the world and change it in return, so dialogue, exploration, and player choices shape one another.

Your game can pair that structure with artwork, animation, sound, video, and an interface of its own. Nothing runs in real time, so there is no movement or physics to build around.

## Is it right for your game?

Doodle Engine fits when dialogue, exploration, and player choice are the heart of the game. Conversations reflect the world and change it, so the story and its systems stay in step.

Those systems are yours to write. Dice rolls, character stats, variables, and conditional branching cover skill checks, bartering, reputation, and a turn-based fight played out in text. All of it is built from the same pieces as the rest of your story.

Presentation is yours too. Game state is kept separate from the interface, so the built-in React renderer can be used as it comes, restyled, or replaced entirely.

A project stays in readable files throughout. Version control and direct editing always work, Doodle Studio edits those same files through a visual editor, and a team can mix both. That structure also makes Doodle Engine a practical way to teach or learn narrative game development.

## Where your game runs

A finished Doodle Engine game is a set of static files: HTML, CSS, JavaScript, and your images, audio, and video. You can host your game on the web, or use a wrapper to run it on desktop and mobile. You can read more about hosting your game on the [Hosting & Deployment](/guides/hosting-and-deployment/) page.

:::note[Looking ahead]
The engine core carries no interface code of its own, so anything can render a Doodle game. Clients for other engines, Godot and Unity among them, are being explored, which would let a Doodle game run inside them.
:::

## Why "Doodle"?

Doodle Engine is named after doodles, the goofy (but lovable!) family of poodle mixes. A doodle is also a freeform sketch: a place to explore an idea and see what it becomes.

The best stories often come from combining interesting concepts and influences. Doodle Engine grew the same way, drawing on games and engines I have enjoyed.

## Other tools

Twine, Ink, Ren'Py, and Doodle Engine can all make branching narrative games. They organize the work differently.

[Twine](https://twinery.org/) centers the work on passages and links. The story format you choose defines how the finished story runs and which features you have. Doodle organizes dialogue as part of a larger RPG world and its systems.

[Ink](https://www.inklestudios.com/ink/) is a scripting language for highly branching narrative. It can power a web story or sit inside a larger game. Doodle's dialogue format belongs to a complete narrative game project with its own world model, editor, and renderer.

[Ren'Py](https://www.renpy.org/) centers visual novel creation on scenes, character sprites, dialogue, menus, and transitions. Doodle focuses on narrative RPGs and adventures, where dialogue, exploration, and persistent game systems work together.

A different engine will serve you better if you need real-time combat, pathfinding, or physics, if you are building a visual novel around character sprites and scene composition, or if you want a pure hypertext tool with minimal structure.

Ready to try it? [Studio or CLI?](/getting-started/studio-or-cli/) helps you pick a way of working, and [Installation](/getting-started/installation/) gets you to a running game.
