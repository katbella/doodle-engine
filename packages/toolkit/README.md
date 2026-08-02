# @doodle-engine/toolkit

The project services behind [Doodle Engine](https://doodleengine.dev), a narrative RPG engine for text-based, story-driven games.

This package does the work on a game project's files: creating a project from the official templates, loading and validating content, running the development server, and producing release builds. The `doodle-engine` command line and Doodle Studio both call it, so a project behaves the same whichever one you use.

```bash
npm install @doodle-engine/toolkit
```

Install this directly only if you are building your own tooling around Doodle projects. To make a game, run `npx doodle-engine create my-game` instead.

- [Documentation](https://doodleengine.dev)
- [CLI Commands](https://doodleengine.dev/reference/cli-commands/)
- [Content Validation](https://doodleengine.dev/guides/content-validation/)
