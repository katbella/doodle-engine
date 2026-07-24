---
"@doodle-engine/core": patch
"@doodle-engine/react": patch
"@doodle-engine/toolkit": patch
"@doodle-engine/cli": patch
"@doodle-engine/studio": patch
---

Studio now shows when a project's Doodle Engine packages are outdated or use different versions and can update them together with the project's existing package manager.

New projects use the exact Doodle Engine release that created them, preventing an older lockfile from silently keeping packages behind when `package.json` says `latest`.

Packaged Studio builds no longer include developer tools in the View menu.
