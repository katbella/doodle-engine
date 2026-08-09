---
title: Glossary
description: Doodle Engine terminology in one place, with links to the pages that use each term.
---

These are the terms used throughout the Doodle Engine documentation. Each entry gives the Doodle Engine meaning, which sometimes narrows or sharpens a general software term.

## Asset

A media file used by the game: an image, an audio file, or a video. Assets live in the project's `assets/` folder, organized by purpose (`images/portraits/`, `audio/music/`, `video/`, and so on). Content files usually refer to an asset by bare filename, and the engine finds the right folder from the field the filename appears in. See [Assets & Media](/guides/assets-and-media/).

## Asset manifest

The generated list of every asset the game needs, with each file's type and size. It has two groups: **shell assets** (splash, loading, and title screen media) load first, and **game assets** (portraits, banners, music, video) load during the loading screen. The development server generates it on request, and a production build writes it to disk. The manifest is a list of what to load, while the [content registry](#content-registry) holds the game's definitions. See [Asset Manifest](/reference/asset-manifest/).

## Character

A person in the game world, defined in a YAML file in `content/characters/`. A character has a name, an assigned starting location, a portrait, optional stats, and a `dialogue` field naming the conversation that starts when the player talks to them. The player is not a character file, and has its own optional `content/player.yaml`. See [Characters & Party](/guides/characters-and-party/).

## Choice

One selectable option inside a dialogue node: the words the player can say or do, plus optional conditions that control when it appears, effects that run when it is picked, and a route to the next node. Choices are player-facing branching; [IF blocks](#if-block) branch without the player seeing anything. See [Writing Dialogues](/guides/writing-dialogues/).

## CLI

The Doodle Engine command line, installed in every project as `@doodle-engine/cli`. It creates projects (`npx doodle-engine create`), runs the development server (`npm run dev`), validates content (`npm run validate`), and produces release builds (`npm run build`). The CLI and [Studio](#studio) work on the same project files, so a project never belongs to one tool. See [CLI Commands](/reference/cli-commands/).

## Condition

A test against the current game state that is either true or false, such as `hasFlag`, `hasItem`, or `questAtStage`. Conditions control whether a choice is visible, which IF branch runs, and whether a triggered dialogue or interlude starts. Multiple conditions on the same element must all pass. Conditions read state; [effects](#effect) change it. See [Conditions](/reference/conditions/).

## Content

Everything that defines your game's world and story: locations, characters, items, dialogues, quests, journal entries, interludes, maps, locales, and the game configuration. Content lives as YAML and `.dlg` files in the project's `content/` folder and does not change while the game runs. What does change during play is [game state](#game-state). See [Project Structure](/getting-started/project-structure/).

## Content registry

The read-only, in-memory collection of all loaded content, organized by type and indexed by ID, so the engine can look up any definition without reading files during play. It is built from `content/` when the game loads and passed to the [engine](#engine)'s constructor. It holds definitions only. Nothing in it records progress. See [Content Registry](/technical/content-registry/).

## Dev server

The local web server started by `npm run dev` or Studio's Preview. It serves the game at `http://localhost:3000`, provides the content registry at `/api/content` and the asset manifest at `/api/manifest`, watches content files, validates on every change, and reloads the browser. See [CLI Commands](/reference/cli-commands/#npm-run-dev).

## Dialogue

One conversation, written in a `.dlg` file in `content/dialogues/`. A dialogue is a graph of [nodes](#node) connected by choices and routes. It starts when the player talks to a character whose `dialogue` field names it, when a `START dialogue` effect runs, or automatically through a [trigger](#trigger). The file's name (without `.dlg`) is the dialogue's ID. See [Writing Dialogues](/guides/writing-dialogues/).

## DSL

Short for domain-specific language: a small scripting format built for one job. Doodle Engine's DSL is the format of `.dlg` files, with keywords such as `NODE`, `CHOICE`, `REQUIRE`, `SET`, and `GOTO` describing how a conversation flows and what it changes. It is content, not program code. See [DSL Syntax](/reference/dsl-syntax/).

## Effect

A change to game state, such as `setFlag`, `addItem`, or `setQuestStage`. Effects run in order when a node is reached, a choice is selected, a passing IF branch runs, or an interlude triggers. In `.dlg` files they are written as keywords like `SET flag metBartender`. Effects change state; [conditions](#condition) only read it. See [Effects](/reference/effects/).

## Engine

The `Engine` class from `@doodle-engine/core` that runs the game. It receives the [content registry](#content-registry), tracks [game state](#game-state), evaluates conditions, applies effects, and answers every player action with a new [snapshot](#snapshot). It contains no interface code, which is what lets any [renderer](#renderer) sit on top of it. See [Engine API](/reference/engine-api/).

## Entity

One structured piece of content with an `id`, defined in its own YAML file: a location, character, item, map, quest, journal entry, or interlude. IDs must be unique within their type. Dialogues and locales are also content but take their IDs from their filenames. See [YAML Schemas](/reference/yaml-schemas/).

## Flag

A named on/off value in game state, used to remember that something happened: `metBartender`, `seenTavernIntro`. Flags are set and cleared by effects and read by conditions. They differ from [variables](#variable), which hold numbers or text. Studio's [Flags & Variables](/studio/flags-and-variables/) page tracks every flag in a project.

## Game config

The settings in `content/game.yaml`: the game title and optional subtitle, starting location, time, flags, variables, and inventory, whether the player enters their own profile (`playerCreatesProfile`), and the optional `shell:` section for splash, loading, and title screen media. The engine reads it once when a new game starts. See [YAML Schemas](/reference/yaml-schemas/#gameconfig).

## Game shell

The screens and menus around the game itself, provided by the `GameShell` React component: asset loading, the splash and title screens, the pause menu, settings, credits, save/load, and video playback. The shell wraps the [renderer](#renderer), and during play `GameRenderer` draws the game inside it. See [Game Shell](/guides/game-shell/).

## Game state

Everything that changes during play: the player's location and time, flags, variables, inventory, quest progress, journal entries, notes, dialogue position, character locations and relationships, and the current locale. State is what a save captures. It is distinct from [content](#content), which never changes during play, and from the [snapshot](#snapshot), which is derived from both. See [Architecture](/technical/architecture/).

## IF block

A conditional branch inside a dialogue node that the player does not choose directly. The engine checks IF blocks top to bottom, runs the effects of the first one whose condition passes, and follows its `GOTO` if it has one. The player never sees this happen, which separates IF blocks from [choices](#choice). See [DSL Syntax](/reference/dsl-syntax/#conditional-blocks-if).

## Interlude

A full-screen narrative scene with scrolling text and optional background art and audio, used for chapter breaks and story transitions. Interludes are YAML entities in `content/interludes/` and appear through the `INTERLUDE` effect or automatically through a trigger location. See [Narrative Interludes](/guides/interludes/).

## Item

An object the player can carry or find, defined in `content/items/`. An item starts in the player's inventory, at a location, or with a character, and moves through the `ADD item`, `REMOVE item`, and `MOVE item` effects. See [Inventory & Items](/guides/inventory-and-items/).

## Journal entry

A fixed piece of writing, defined in `content/journal/`, that the player unlocks through the `ADD journalEntry` effect. Entries hold lore, people, and places, carry a `category` for grouping, and appear in the Journal panel beneath the active quests. An entry is either unlocked or not, which is what separates it from a [quest](#quest) and its stages, and from a [player note](#player-note) the player writes. See [Journal Entries](/guides/journal-entries/).

## Locale

One language's text, stored as a flat key-to-text YAML file in `content/locales/`. The filename is the locale code: `en.yaml` is `"en"`. Content refers to a locale entry with a [localization key](#localization-key). See [Localization](/guides/localization/).

## Localization key

A reference to a locale entry, written with an `@` prefix: `name: "@location.tavern.name"`. When building a snapshot, the engine replaces the key with the text from the current locale. A missing key is shown as the raw `@key` so it can be found and fixed. See [Localization](/guides/localization/).

## Location

A place in the game world, defined in `content/locations/`, with a name, description, and optional banner image, music, and ambient sound. The player is always at exactly one location and travels between them on a [map](#map). See [Adding Locations](/guides/adding-locations/).

## Map

A travel screen connecting locations, defined in `content/maps/`. A map has a background image, a `scale` (pixels per hour of travel), and markers placing locations at coordinates. The engine shows the map containing the player's current location, and each location may appear on only one map. See [Adding Locations](/guides/adding-locations/#creating-a-map).

## Node

One moment in a dialogue: at most one speaker or narrator line, optional choices, optional conditions and effects, and a route onward. A node with text and no choices shows a Continue button. A node with no text and no choices is a silent processing node that applies its effects and advances instantly. See [DSL Syntax](/reference/dsl-syntax/#text-nodes-and-silent-nodes).

## Party

The characters traveling with the player. Party members appear in the snapshot's `party` list rather than among the characters at a location, and they move with the player. The `ADD toParty` and `REMOVE fromParty` effects manage membership. See [Characters & Party](/guides/characters-and-party/#party-management).

## Player note

A note the player writes during play, holding a title and some text. Notes are kept in game state and restored with a save. They are the player's own record, distinct from a [journal entry](#journal-entry), which is content you write and the game unlocks. See [Player Notes](/guides/player-notes/).

## Project

One game: a folder containing its `content/`, `assets/`, `src/` application code, and configuration. Studio and the CLI both operate on this same folder, and the files are the source of truth. See [Project Structure](/getting-started/project-structure/).

## Project ID

The generated identifier in `src/project.ts` that keeps a game's browser saves separate from other Doodle Engine games. It must stay the same across releases of one game, and a copied project must get a new one before release. See [Save & Load](/guides/save-and-load/).

## Quest

A tracked objective with ordered stages, defined in `content/quests/`. A quest advances when a dialogue runs `SET questStage`, and its current stage's description appears in the player's journal. The `questAtStage` condition connects dialogue to quest progress. See [Creating Quests](/guides/creating-quests/).

## Quest Status

`not_started` means the quest has no current stage. `active` means it has started. `complete` means its current stage has `completesQuest: true`.

## Tracked Quest

The single active quest the player has chosen to follow. Tracking clears when that quest completes.

## Relationship

A per-character number, starting at 0, that records how a character regards the player. Effects raise or lower it, and the `relationshipAbove` and `relationshipBelow` conditions branch on it. See [Characters & Party](/guides/characters-and-party/#relationships).

## Renderer

The code that turns a [snapshot](#snapshot) into the interface the player sees and calls engine actions when the player does something. Doodle Engine ships a complete React renderer (`GameRenderer` inside `GameShell`), and because the engine has no interface code, you can restyle it, rearrange its components, or replace it entirely. See [Custom Renderer](/technical/custom-renderer/).

## Snapshot

The engine's description of the current game screen, produced after every player action: the resolved location, dialogue line, visible choices, party, inventory, quests, and interface strings, with localization keys already resolved and hidden choices already filtered out. The renderer displays snapshots and never reads engine state directly. See [Architecture](/technical/architecture/).

## Stat

A named value on a character or the player, such as strength or class, defined in the character's YAML and changed with the `SET characterStat` and `ADD characterStat` effects. Stats belong to one character, while [variables](#variable) are global. A stat key starting with `_` stays off the built-in character sheet. See [Characters & Party](/guides/characters-and-party/#character-stats).

## Studio

Doodle Studio, the desktop application for building Doodle Engine games. It edits the same project files as the CLI through visual controls and a source editor, and adds playtesting, validation, asset importing, and builds. See [Doodle Studio](/studio/).

## Trigger

The declaration that starts a dialogue or interlude automatically when the player enters a location: `TRIGGER <locationId>` at the top of a `.dlg` file, or `triggerLocation` in an interlude's YAML. Top-level `REQUIRE` lines or `triggerConditions` guard it, and pairing a `notFlag` condition with a matching `setFlag` effect makes it fire once. See [Writing Dialogues](/guides/writing-dialogues/#triggered-dialogues).

## Validation

The check that content is well-formed and internally consistent: syntax parses, IDs are unique, references point at content that exists, and conditions and effects have their required arguments. It runs on every change during development, before every build, on demand with `npm run validate`, and through Studio's Validate button. See [Content Validation](/guides/content-validation/).

## Variable

A named number or text value in global game state, such as `gold` or `reputation`. Variables are changed by effects, tested by conditions, and can appear inside dialogue text as `{gold}`. A name starting with `_` is hidden from the built-in renderer's Resources panel but works everywhere else. See [Flags & Variables](/guides/flags-and-variables/).
