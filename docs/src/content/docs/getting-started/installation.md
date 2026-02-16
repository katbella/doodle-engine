---
title: Installation
description: How to create a new Doodle Engine game project.
---

## Quick Start

Scaffold a new game project with the CLI:

```bash
npx create-doodle-engine-game my-game
```

The scaffolder will prompt you:

1. **Project name**: directory name for your game
2. **Use default renderer?**: whether to include the batteries-included `GameRenderer` or start with a custom setup

Then install and run:

```bash
cd my-game
npm install       # or: yarn install / pnpm install
npm run dev        # or: yarn dev / pnpm dev
```

Your game is now running at `http://localhost:3000`.

## Manual Setup

If you prefer to set up manually, install the packages:

```bash
npm install @doodle-engine/core @doodle-engine/react
npm install -D @doodle-engine/cli vite
```

You'll need:

- **Node.js 24+**
- **npm**, **yarn**, or **pnpm**
- **TypeScript 5.7+**

### package.json

```json
{
  "scripts": {
    "dev": "doodle dev",
    "build": "doodle build"
  },
  "dependencies": {
    "@doodle-engine/core": "latest",
    "@doodle-engine/react": "latest"
  },
  "devDependencies": {
    "@doodle-engine/cli": "latest",
    "vite": "^6.0.0"
  }
}
```

### Entry Point

Create `src/main.tsx`:

```tsx
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)
```

Create `src/App.tsx` using `GameShell`:

```tsx
import { useEffect, useState } from 'react'
import type { ContentRegistry, GameConfig } from '@doodle-engine/core'
import { GameShell } from '@doodle-engine/react'

export default function App() {
  const [content, setContent] = useState<{
    registry: ContentRegistry
    config: GameConfig
  } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then((res) => res.json())
      .then((data) => setContent({ registry: data.registry, config: data.config }))
  }, [])

  if (!content) return <div>Loading...</div>

  return (
    <GameShell
      registry={content.registry}
      config={content.config}
      title="My Game"
    />
  )
}
```

### Content Directory

Create a `content/` directory with at minimum:

- `content/game.yaml`: game configuration
- `content/locations/`: location YAML files
- `content/locales/en.yaml`: English strings

See [Project Structure](../getting-started/project-structure/) for the full layout.
