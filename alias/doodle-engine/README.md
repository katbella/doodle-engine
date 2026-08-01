# doodle-engine

The [Doodle Engine](https://doodleengine.dev) command line. Create a narrative game project:

```bash
npx doodle-engine create my-game
```

This package is a small launcher for [`@doodle-engine/cli`](https://www.npmjs.com/package/@doodle-engine/cli), published under the short name so the create command is easy to type and remember. Inside a project, the CLI is a regular dependency and runs through the project's npm scripts.

It lives in the `alias/` folder of the Doodle Engine repository, outside the versioned workspace packages, and is published manually when its dependency range needs widening.
