import { useEffect, useState } from 'react'
import { Engine } from '@doodle-engine/core'
import type { GameState, Snapshot } from '@doodle-engine/core'
import { GameProvider, useGame } from '@doodle-engine/react'

export function App() {
  const [game, setGame] = useState<{ engine: Engine; snapshot: Snapshot } | null>(null)

  useEffect(() => {
    fetch('/api/content')
      .then(res => res.json())
      .then(data => {
        const engine = new Engine(data.registry, createEmptyState())
        const snapshot = engine.newGame(data.config)
        setGame({ engine, snapshot })
      })
  }, [])

  if (!game) {
    return <div className="app-bootstrap"><div className="spinner" /></div>
  }

  return (
    <GameProvider engine={game.engine} initialSnapshot={game.snapshot} devTools={import.meta.env.DEV}>
      <GameUI />
    </GameProvider>
  )
}

function GameUI() {
  const { snapshot, actions } = useGame()

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>{snapshot.location.name}</h1>
      <p>{snapshot.location.description}</p>

      {snapshot.dialogue && (
        <div style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px', margin: '1rem 0' }}>
          <strong>{snapshot.dialogue.speakerName}:</strong>
          <p>{snapshot.dialogue.text}</p>
          {snapshot.choices.map(choice => (
            <button
              key={choice.id}
              onClick={() => actions.selectChoice(choice.id)}
              style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              {choice.text}
            </button>
          ))}
        </div>
      )}

      {!snapshot.dialogue && snapshot.charactersHere.length > 0 && (
        <div>
          <h2>Characters here</h2>
          {snapshot.charactersHere.map(char => (
            <button
              key={char.id}
              onClick={() => actions.talkTo(char.id)}
              style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Talk to {char.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function createEmptyState(): GameState {
  return {
    currentLocation: '',
    currentTime: { day: 1, hour: 0 },
    flags: {},
    variables: {},
    inventory: [],
    questProgress: {},
    unlockedJournalEntries: [],
    playerNotes: [],
    dialogueState: null,
    characterState: {},
    itemLocations: {},
    mapEnabled: true,
    notifications: [],
    pendingSounds: [],
    pendingVideo: null,
    pendingInterlude: null,
    currentLocale: 'en',
  }
}
