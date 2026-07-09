---
"@doodle-engine/core": minor
"@doodle-engine/react": minor
"@doodle-engine/cli": minor
---

Align engine, renderer, CLI, and docs around the audited game runtime behavior.

- Core now supports conditional branch effects, simplified multi-map travel without regions, optional initial engine state for new games, stricter asset path normalization, and complete manifest extraction for gameplay media.
- React now routes stock media through the asset loader, waits for shell and game assets before rendering gameplay, exposes asset helpers for custom renderers, and includes input routing support for renderer surfaces.
- CLI now validates built-in content references, fails fast for missing local assets, copies project assets into production builds, scaffolds the updated asset layout, and wires custom renderer projects through the asset manifest.
