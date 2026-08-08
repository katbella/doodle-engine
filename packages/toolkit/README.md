# @doodle-engine/toolkit

The project services behind [Doodle Engine](https://doodleengine.dev), a narrative RPG engine for text-based, story-driven games.

This package does the work on a game project's files: creating a project from the official templates, loading and validating content, running the development server, and producing release builds. The `doodle-engine` command line and Doodle Studio both call it, so a project behaves the same whichever one you use.

The default React renderer can be created with one of four presentation templates:

- **Starter RPG**: the complete, neutral default and easiest place to begin.
- **Minimal**: only the text and choices, with no additional frills.
- **Prose**: a book-like reading and choice experience.
- **Fable**: a dark fantasy presentation with optional user-supplied texture hooks.

The themed templates include an explicit 1920×1080 stage scaler. It can be disabled or tuned in the generated `src/project.ts`; colors, spacing, typography, and layout dimensions are exposed as CSS custom properties in `src/renderer-theme.css`. Project overrides belong in `src/renderer-overrides.css`, which theme switching preserves.

```bash
npm install @doodle-engine/toolkit
```

Install this directly only if you are building your own tooling around Doodle projects. To make a game, run `npx doodle-engine create my-game` instead.

- [Documentation](https://doodleengine.dev)
- [CLI Commands](https://doodleengine.dev/reference/cli-commands/)
- [Content Validation](https://doodleengine.dev/guides/content-validation/)
