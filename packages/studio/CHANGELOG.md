# @doodle-engine/studio

## 0.2.2

### Patch Changes

- c46460c: Studio now shows when a project's Doodle Engine packages are outdated or use different versions and can update them together with the project's existing package manager.

    New projects use the exact Doodle Engine release that created them, preventing an older lockfile from silently keeping packages behind when `package.json` says `latest`.

    Packaged Studio builds no longer include developer tools in the View menu.

## 0.2.1

### Patch Changes

- Fix Studio packaging checks on macOS and Windows by making filesystem path and app lifecycle tests platform-aware.

## 0.2.0

### Minor Changes

- 15baf00: Doodle Studio foundation.
    - **core**: add a lossless `.dlg` parser (`parseDialogueCst`, `printDialogueCst`, `cstToDialogue`) that keeps comments and formatting, for round-trip visual editing. The quote-aware comment rule is now shared so the runtime and the editor agree.
    - **toolkit**: new `@doodle-engine/toolkit` package holding the project services (`loadProject`, `validateContent`, `generateAssetManifest`, `buildProject`, `startDevServer`, `createProject`) that used to live inside CLI commands, callable with explicit paths and structured results.
    - **cli**: `build`, `dev`, `validate`, and `create` are now thin wrappers over the toolkit; the duplicate content loader is gone.
    - **react**: save slots now use the project's generated UUID. `GameShell`, `GameRenderer`, and `SaveLoadPanel` require `projectId`, and low-level save helpers reject shared or hand-written browser-storage keys.
    - **toolkit**: generated projects include a stable `src/project.ts` identity so renaming or moving a game does not change its saves.
    - **studio**: add the Electron editor for creating, validating, previewing, and building Doodle projects, with structured and source editing, dialogue graph tools, a project overview, documentation access, and more reliable Windows saves.
