# @doodle-engine/core

## 0.1.3

### Patch Changes

- 08a813f: Parser catches malformed dialogue content instead of silently mishandling it: a colon inside a CHOICE, IF, GOTO, PORTRAIT, or effect line no longer gets misread as a speaker line; a node with more than one speaker line is now a parse error; a spoken line inside a CHOICE is now a parse error; quotes and multi-word values in effect and condition arguments are now rejected; and a `roll` condition can no longer be used in a choice REQUIRE. Generated choice IDs are now unique per node.

    The CLI's validate, build, and dev commands now share one content loader. A broken `.dlg` file is reported by name instead of silently dropping every dialogue after it in the same folder, and duplicate choice IDs within a node are now caught by validation.

    Dev tools `teleport` and `triggerDialogue` now match real gameplay: teleport can reach any location, and triggerDialogue starts a conversation the same way the engine does.

    Save and load now supports quick saves, autosaves on travel, and multiple manual saves that can be loaded or deleted from the Save/Load panel.

    The bundled `.dlg` syntax highlighter now colors `{variable}` interpolation and mixed-case speaker names, repackaged as 1.1.0.

## 0.1.2

### Patch Changes

- 49413c2: Include the starter interlude background asset in generated projects.

## 0.1.1

### Patch Changes

- Update docs to reflect latest engine upgrades.

## 0.1.0

### Minor Changes

- e6db033: Align engine, renderer, CLI, and docs around the audited game runtime behavior.
    - Core now supports conditional branch effects, simplified multi-map travel without regions, optional initial engine state for new games, stricter asset path normalization, and complete manifest extraction for gameplay media.
    - React now routes stock media through the asset loader, waits for shell and game assets before rendering gameplay, exposes asset helpers for custom renderers, and includes input routing support for renderer surfaces.
    - CLI now validates built-in content references, fails fast for missing local assets, copies project assets into production builds, scaffolds the updated asset layout, and wires custom renderer projects through the asset manifest.

## 0.0.38

### Patch Changes

- 973f413: patch security vulnerabilities in deps

## 0.0.37

### Patch Changes

- fcfa9bb: package manifests

## 0.0.36

### Patch Changes

- 00f567f: dependency updates

## 0.0.35

### Patch Changes

- 831b748: fix ambient sound implementation

## 0.0.34

### Patch Changes

- 9b77754: fix playMusic implementation and docs

## 0.0.33

### Patch Changes

- 51fb9f1: auto continue

## 0.0.32

### Patch Changes

- 61f5336: fix party travel

## 0.0.31

### Patch Changes

- 4e1975e: extension bundling

## 0.0.30

### Patch Changes

- 37d7178: fix distance scaling

## 0.0.29

### Patch Changes

- 977a2cb: fix calculate travel time

## 0.0.28

### Patch Changes

- e8a7103: add starter css

## 0.0.27

### Patch Changes

- d0420be: validation fixes

## 0.0.26

### Patch Changes

- c17f41c: remove temp

## 0.0.25

### Patch Changes

- 3d6777c: update docs, fix asset routing

## 0.0.24

### Patch Changes

- 21af7c9: docs link update

## 0.0.23

### Patch Changes

- ab7ff80: cli formatting and docs fixes

## 0.0.22

### Patch Changes

- edffc3b: fix routing

## 0.0.21

### Patch Changes

- beffac5: prettier

## 0.0.20

### Patch Changes

- 96d5194: fix missing css

## 0.0.19

### Patch Changes

- 07090d1: feature: asset loader

## 0.0.18

### Patch Changes

- eabd6f3: update placeholders

## 0.0.17

### Patch Changes

- 07107df: fix bluff checks

## 0.0.16

### Patch Changes

- 3562b28: dialogue bugs

## 0.0.15

### Patch Changes

- c143488: update validator

## 0.0.14

### Patch Changes

- 85dd03e: update dice roll template

## 0.0.13

### Patch Changes

- f21b68e: Updated docs and templates

## 0.0.12

### Patch Changes

- a509381: Add dice roller

## 0.0.11

### Patch Changes

- 8716abd: update templates for interlude

## 0.0.10

### Patch Changes

- ecfe7ba: Added Interludes

## 0.0.9

### Patch Changes

- 90cd5a7: Update validator and dev tools, added loading screen

## 0.0.8

### Patch Changes

- 599ce7c: Dev tooling and DSL validation

## 0.0.7

### Patch Changes

- b7ac02f: Fix Github release tagging

## 0.0.6

### Patch Changes

- 579a2e2: update build script to only build once

## 0.0.5

### Patch Changes

- 632bffe: move scaffolding to doodle create subcommand, fix workspace protocol in published packages

## 0.0.4

### Patch Changes

- 204abef: update release script because yarn 4 has some publishing issues

## 0.0.3

### Patch Changes

- 9aba18f: move project scaffolding to `doodle create` subcommand
- 14ff820: move project scaffolding to doodle create subcommand

## 0.0.2

### Patch Changes

- 09a12e4: Initial publish
