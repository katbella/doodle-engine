---
"@doodle-engine/core": patch
"@doodle-engine/cli": patch
"@doodle-engine/react": patch
---

Parser catches malformed dialogue content instead of silently mishandling it: a colon inside a CHOICE, IF, GOTO, PORTRAIT, or effect line no longer gets misread as a speaker line; a node with more than one speaker line is now a parse error; a spoken line inside a CHOICE is now a parse error; quotes and multi-word values in effect and condition arguments are now rejected; and a `roll` condition can no longer be used in a choice REQUIRE. Generated choice IDs are now unique per node.

The CLI's validate, build, and dev commands now share one content loader. A broken `.dlg` file is reported by name instead of silently dropping every dialogue after it in the same folder, and duplicate choice IDs within a node are now caught by validation.

Dev tools `teleport` and `triggerDialogue` now match real gameplay: teleport can reach any location, and triggerDialogue starts a conversation the same way the engine does.

Save and load now supports quick saves, autosaves on travel, and multiple manual saves that can be loaded or deleted from the Save/Load panel.

The bundled `.dlg` syntax highlighter now colors `{variable}` interpolation and mixed-case speaker names, repackaged as 1.1.0.
