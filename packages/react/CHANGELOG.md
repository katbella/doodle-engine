# @doodle-engine/react

## 0.2.2

### Patch Changes

- c46460c: Studio now shows when a project's Doodle Engine packages are outdated or use different versions and can update them together with the project's existing package manager.

    New projects use the exact Doodle Engine release that created them, preventing an older lockfile from silently keeping packages behind when `package.json` says `latest`.

    Packaged Studio builds no longer include developer tools in the View menu.

- Updated dependencies [c46460c]
    - @doodle-engine/core@0.2.2

## 0.2.1

### Patch Changes

- Version kept in lockstep with the Doodle Studio 0.2.1 packaging fix.
- @doodle-engine/core@0.2.1

## 0.2.0

### Minor Changes

- 15baf00: Doodle Studio foundation.
    - **core**: add a lossless `.dlg` parser (`parseDialogueCst`, `printDialogueCst`, `cstToDialogue`) that keeps comments and formatting, for round-trip visual editing. The quote-aware comment rule is now shared so the runtime and the editor agree.
    - **toolkit**: new `@doodle-engine/toolkit` package holding the project services (`loadProject`, `validateContent`, `generateAssetManifest`, `buildProject`, `startDevServer`, `createProject`) that used to live inside CLI commands, callable with explicit paths and structured results.
    - **cli**: `build`, `dev`, `validate`, and `create` are now thin wrappers over the toolkit; the duplicate content loader is gone.
    - **react**: save slots now use the project's generated UUID. `GameShell`, `GameRenderer`, and `SaveLoadPanel` require `projectId`, and low-level save helpers reject shared or hand-written browser-storage keys.
    - **toolkit**: generated projects include a stable `src/project.ts` identity so renaming or moving a game does not change its saves.
    - **studio**: add the Electron editor for creating, validating, previewing, and building Doodle projects, with structured and source editing, dialogue graph tools, a project overview, documentation access, and more reliable Windows saves.

### Patch Changes

- Updated dependencies [15baf00]
    - @doodle-engine/core@0.2.0

## 0.1.3

### Patch Changes

- 08a813f: Parser catches malformed dialogue content instead of silently mishandling it: a colon inside a CHOICE, IF, GOTO, PORTRAIT, or effect line no longer gets misread as a speaker line; a node with more than one speaker line is now a parse error; a spoken line inside a CHOICE is now a parse error; quotes and multi-word values in effect and condition arguments are now rejected; and a `roll` condition can no longer be used in a choice REQUIRE. Generated choice IDs are now unique per node.

    The CLI's validate, build, and dev commands now share one content loader. A broken `.dlg` file is reported by name instead of silently dropping every dialogue after it in the same folder, and duplicate choice IDs within a node are now caught by validation.

    Dev tools `teleport` and `triggerDialogue` now match real gameplay: teleport can reach any location, and triggerDialogue starts a conversation the same way the engine does.

    Save and load now supports quick saves, autosaves on travel, and multiple manual saves that can be loaded or deleted from the Save/Load panel.

    The bundled `.dlg` syntax highlighter now colors `{variable}` interpolation and mixed-case speaker names, repackaged as 1.1.0.

- Updated dependencies [08a813f]
    - @doodle-engine/core@0.1.3

## 0.1.2

### Patch Changes

- 49413c2: Include the starter interlude background asset in generated projects.
- Updated dependencies [49413c2]
    - @doodle-engine/core@0.1.2

## 0.1.1

### Patch Changes

- Update docs to reflect latest engine upgrades.
- Updated dependencies
    - @doodle-engine/core@0.1.1

## 0.1.0

### Minor Changes

- e6db033: Align engine, renderer, CLI, and docs around the audited game runtime behavior.
    - Core now supports conditional branch effects, simplified multi-map travel without regions, optional initial engine state for new games, stricter asset path normalization, and complete manifest extraction for gameplay media.
    - React now routes stock media through the asset loader, waits for shell and game assets before rendering gameplay, exposes asset helpers for custom renderers, and includes input routing support for renderer surfaces.
    - CLI now validates built-in content references, fails fast for missing local assets, copies project assets into production builds, scaffolds the updated asset layout, and wires custom renderer projects through the asset manifest.

### Patch Changes

- Updated dependencies [e6db033]
    - @doodle-engine/core@0.1.0

## 0.0.38

### Patch Changes

- 973f413: patch security vulnerabilities in deps
- Updated dependencies [973f413]
    - @doodle-engine/core@0.0.38

## 0.0.37

### Patch Changes

- fcfa9bb: package manifests
- Updated dependencies [fcfa9bb]
    - @doodle-engine/core@0.0.37

## 0.0.36

### Patch Changes

- 00f567f: dependency updates
- Updated dependencies [00f567f]
    - @doodle-engine/core@0.0.36

## 0.0.35

### Patch Changes

- 831b748: fix ambient sound implementation
- Updated dependencies [831b748]
    - @doodle-engine/core@0.0.35

## 0.0.34

### Patch Changes

- 9b77754: fix playMusic implementation and docs
- Updated dependencies [9b77754]
    - @doodle-engine/core@0.0.34

## 0.0.33

### Patch Changes

- 51fb9f1: auto continue
- Updated dependencies [51fb9f1]
    - @doodle-engine/core@0.0.33

## 0.0.32

### Patch Changes

- 61f5336: fix party travel
- Updated dependencies [61f5336]
    - @doodle-engine/core@0.0.32

## 0.0.31

### Patch Changes

- 4e1975e: extension bundling
- Updated dependencies [4e1975e]
    - @doodle-engine/core@0.0.31

## 0.0.30

### Patch Changes

- 37d7178: fix distance scaling
- Updated dependencies [37d7178]
    - @doodle-engine/core@0.0.30

## 0.0.29

### Patch Changes

- 977a2cb: fix calculate travel time
- Updated dependencies [977a2cb]
    - @doodle-engine/core@0.0.29

## 0.0.28

### Patch Changes

- e8a7103: add starter css
- Updated dependencies [e8a7103]
    - @doodle-engine/core@0.0.28

## 0.0.27

### Patch Changes

- d0420be: validation fixes
- Updated dependencies [d0420be]
    - @doodle-engine/core@0.0.27

## 0.0.26

### Patch Changes

- c17f41c: remove temp
- Updated dependencies [c17f41c]
    - @doodle-engine/core@0.0.26

## 0.0.25

### Patch Changes

- 3d6777c: update docs, fix asset routing
- Updated dependencies [3d6777c]
    - @doodle-engine/core@0.0.25

## 0.0.24

### Patch Changes

- 21af7c9: docs link update
- Updated dependencies [21af7c9]
    - @doodle-engine/core@0.0.24

## 0.0.23

### Patch Changes

- ab7ff80: cli formatting and docs fixes
- Updated dependencies [ab7ff80]
    - @doodle-engine/core@0.0.23

## 0.0.22

### Patch Changes

- edffc3b: fix routing
- Updated dependencies [edffc3b]
    - @doodle-engine/core@0.0.22

## 0.0.21

### Patch Changes

- beffac5: prettier
- Updated dependencies [beffac5]
    - @doodle-engine/core@0.0.21

## 0.0.20

### Patch Changes

- 96d5194: fix missing css
- Updated dependencies [96d5194]
    - @doodle-engine/core@0.0.20

## 0.0.19

### Patch Changes

- 07090d1: feature: asset loader
- Updated dependencies [07090d1]
    - @doodle-engine/core@0.0.19

## 0.0.18

### Patch Changes

- eabd6f3: update placeholders
- Updated dependencies [eabd6f3]
    - @doodle-engine/core@0.0.18

## 0.0.17

### Patch Changes

- 07107df: fix bluff checks
- Updated dependencies [07107df]
    - @doodle-engine/core@0.0.17

## 0.0.16

### Patch Changes

- 3562b28: dialogue bugs
- Updated dependencies [3562b28]
    - @doodle-engine/core@0.0.16

## 0.0.15

### Patch Changes

- c143488: update validator
- Updated dependencies [c143488]
    - @doodle-engine/core@0.0.15

## 0.0.14

### Patch Changes

- 85dd03e: update dice roll template
- Updated dependencies [85dd03e]
    - @doodle-engine/core@0.0.14

## 0.0.13

### Patch Changes

- f21b68e: Updated docs and templates
- Updated dependencies [f21b68e]
    - @doodle-engine/core@0.0.13

## 0.0.12

### Patch Changes

- a509381: Add dice roller
- Updated dependencies [a509381]
    - @doodle-engine/core@0.0.12

## 0.0.11

### Patch Changes

- 8716abd: update templates for interlude
- Updated dependencies [8716abd]
    - @doodle-engine/core@0.0.11

## 0.0.10

### Patch Changes

- ecfe7ba: Added Interludes
- Updated dependencies [ecfe7ba]
    - @doodle-engine/core@0.0.10

## 0.0.9

### Patch Changes

- 90cd5a7: Update validator and dev tools, added loading screen
- Updated dependencies [90cd5a7]
    - @doodle-engine/core@0.0.9

## 0.0.8

### Patch Changes

- 599ce7c: Dev tooling and DSL validation
- Updated dependencies [599ce7c]
    - @doodle-engine/core@0.0.8

## 0.0.7

### Patch Changes

- b7ac02f: Fix Github release tagging
- Updated dependencies [b7ac02f]
    - @doodle-engine/core@0.0.7

## 0.0.6

### Patch Changes

- 579a2e2: update build script to only build once
- Updated dependencies [579a2e2]
    - @doodle-engine/core@0.0.6

## 0.0.5

### Patch Changes

- 632bffe: move scaffolding to doodle create subcommand, fix workspace protocol in published packages
- Updated dependencies [632bffe]
    - @doodle-engine/core@0.0.5

## 0.0.4

### Patch Changes

- 204abef: update release script because yarn 4 has some publishing issues
- Updated dependencies [204abef]
    - @doodle-engine/core@0.0.4

## 0.0.3

### Patch Changes

- 9aba18f: move project scaffolding to `doodle create` subcommand
- 14ff820: move project scaffolding to doodle create subcommand
- Updated dependencies [9aba18f]
- Updated dependencies [14ff820]
    - @doodle-engine/core@0.0.3

## 0.0.2

### Patch Changes

- 09a12e4: Initial publish
- Updated dependencies [09a12e4]
    - @doodle-engine/core@0.0.2
