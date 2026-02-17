import { useEffect, useState } from 'react'
import type { ContentRegistry, GameConfig } from '@doodle-engine/core'
import { GameShell, LoadingScreen } from '@doodle-engine/react'

export function App() {
  const [content, setContent] = useState<{ registry: ContentRegistry; config: GameConfig } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => setContent({ registry: data.registry, config: data.config }))
  }, [])

  if (!content) {
    return <LoadingScreen />
  }

  return (
    <GameShell
      registry={content.registry}
      config={content.config}
      title="My Doodle Game"
      subtitle="A text-based adventure"
      splashDuration={2000}
      availableLocales={[{ code: 'en', label: 'English' }]}
      devTools={import.meta.env.DEV}
    />
  )
}
