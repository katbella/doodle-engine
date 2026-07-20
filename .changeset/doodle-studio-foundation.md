---
"@doodle-engine/core": minor
"@doodle-engine/react": minor
"@doodle-engine/toolkit": minor
"@doodle-engine/cli": minor
---

Doodle Studio foundation.

- **core**: add a lossless `.dlg` parser (`parseDialogueCst`, `printDialogueCst`, `cstToDialogue`) that keeps comments and formatting, for round-trip visual editing. The quote-aware comment rule is now shared so the runtime and the editor agree.
- **toolkit**: new `@doodle-engine/toolkit` package holding the project services (`loadProject`, `validateContent`, `generateAssetManifest`, `buildProject`, `startDevServer`, `createProject`) that used to live inside CLI commands, callable with explicit paths and structured results.
- **cli**: `build`, `dev`, `validate`, and `create` are now thin wrappers over the toolkit; the duplicate content loader is gone.
- **react**: save slots now use the project's generated UUID. `GameShell`, `GameRenderer`, and `SaveLoadPanel` require `projectId`, and low-level save helpers reject shared or hand-written browser-storage keys.
- **toolkit**: generated projects include a stable `src/project.ts` identity so renaming or moving a game does not change its saves.
