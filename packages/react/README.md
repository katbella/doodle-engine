# @doodle-engine/react

The React renderer for [Doodle Engine](https://doodleengine.dev), a narrative RPG engine for text-based, story-driven games.

This package turns engine snapshots into a playable interface. Use `GameShell` for a complete game with loading, title, pause, and settings screens, or take the individual components, such as `DialogueBox`, `MapView`, and `Inventory`, and arrange your own.

```bash
npm install @doodle-engine/react
```

```tsx
import { GameShell } from '@doodle-engine/react';

<GameShell registry={registry} config={config} manifest={manifest} projectId={PROJECT_ID} />;
```

Most people never install this directly. `npx doodle-engine create my-game` sets up a project with it already in place.

- [Documentation](https://doodleengine.dev)
- [React Components](https://doodleengine.dev/reference/react-components/)
- [Custom Renderer](https://doodleengine.dev/technical/custom-renderer/)
