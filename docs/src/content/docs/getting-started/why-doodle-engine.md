---
title: Why Doodle Engine
description: What Doodle Engine is for, when it fits, and how it compares to other narrative tools.
---

Doodle Engine is for building story-rich text adventures and narrative RPGs.

It takes inspiration from the Infinity Engine games of the late 1990s and early 2000s, especially *Baldur's Gate*, *Icewind Dale*, and *Planescape: Torment*. In those games the story is tied to game state. Conversations react to the world and change it in return, so what the player says and does carries through the rest of the game.

Your game can pair that structure with artwork, animation, sound, video, and an interface of its own. Doodle Engine games do not run in real time, so there is no movement or physics to build around.

## Is it right for your game?

Doodle Engine fits when dialogue and player choice are the heart of the game, with mechanics such as skill checks or turn-based combat supporting the story.

Game state is kept separate from the interface, so the built-in React renderer can be used as is out of the box, restyled, or replaced entirely.

Doodle Engine projects are stored as readable text files, so you can edit them directly and track changes with version control. Doodle Studio is a visual editor for those same files, and people working together can use either approach on the same project.

## Where your game runs

A finished Doodle Engine game is a set of static files: HTML, CSS, JavaScript, and your images, audio, and video. You can host your game on the web, or use a wrapper to run it on desktop and mobile. You can read more about hosting your game on the [Hosting & Deployment](/guides/hosting-and-deployment/) page.

:::note[Looking ahead]
The engine core carries no interface code of its own, so anything can render a Doodle Engine game. Clients for other engines, Godot and Unity among them, are being explored, which would let a Doodle Engine game run inside them.
:::

## Why the name?

Doodle Engine is named after doodles, the goofy (but lovable!) family of poodle mixes. A doodle is also a freeform sketch: a place to explore an idea and see what it becomes.

The best stories often come from combining interesting concepts and influences. Doodle Engine grew the same way, drawing on games and engines I have enjoyed.

## Other tools

Twine, Ink, Ren'Py, and Doodle Engine can all make branching narrative games. They organize the work differently.

[Twine](https://twinery.org/) centers the work on passages and links. The story format you choose defines how the finished story runs and which features you have. Doodle Engine organizes dialogue as part of a larger RPG world and its systems.

[Ink](https://www.inklestudios.com/ink/) is a scripting language for highly branching narrative. It can power a web story or sit inside a larger game. Doodle Engine's dialogue format belongs to a complete narrative game project with its own world model, editor, and renderer.

[Ren'Py](https://www.renpy.org/) centers visual novel creation on scenes, character sprites, dialogue, menus, and transitions. Doodle Engine focuses on narrative RPGs and adventures, where dialogue, exploration, and persistent game systems work together.

A different engine will serve you better if you need real-time combat, pathfinding, or physics, if you are building a visual novel around character sprites and scene composition, or if you want a pure hypertext tool with minimal structure.

Ready to try it? [Studio or CLI?](/getting-started/studio-or-cli/) helps you pick a way of working, and [Installation](/getting-started/installation/) gets you to a running game.
