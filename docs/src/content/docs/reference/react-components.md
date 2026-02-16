---
title: React Components
description: Reference for all React components and their props.
---

All components are exported from `@doodle-engine/react`.

## GameProvider

Context provider that wraps the game UI. Holds the engine instance and manages state updates.

```tsx
import { GameProvider } from '@doodle-engine/react'

<GameProvider engine={engine} initialSnapshot={snapshot}>
  {children}
</GameProvider>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `engine` | `Engine` | Engine instance (already initialized) |
| `initialSnapshot` | `Snapshot` | Initial snapshot (from `newGame` or `loadGame`) |
| `children` | `ReactNode` | Child components |

### Context Value

```typescript
interface GameContextValue {
  snapshot: Snapshot
  actions: {
    selectChoice: (choiceId: string) => void
    talkTo: (characterId: string) => void
    takeItem: (itemId: string) => void
    travelTo: (locationId: string) => void
    writeNote: (title: string, text: string) => void
    deleteNote: (noteId: string) => void
    setLocale: (locale: string) => void
    saveGame: () => SaveData
    loadGame: (saveData: SaveData) => void
  }
}
```

Access via `useGame()` hook.

## GameRenderer

Batteries-included full-screen renderer. Provides a complete game UI with all components pre-wired.

```tsx
import { GameRenderer } from '@doodle-engine/react'

<GameProvider engine={engine} initialSnapshot={snapshot}>
  <GameRenderer className="my-game" />
</GameProvider>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | CSS class |

### Layout

- **Main area**: Location view with banner, dialogue box, choices, or character list
- **Sidebar**: Save/load, resources (visible variables), party, inventory, journal, map

### Features

- Auto-filters underscore-prefixed variables from the Resources panel
- Integrates `useAudioManager` for automatic audio playback
- Shows notifications as transient overlays

## DialogueBox

Displays the current dialogue node with speaker name, portrait, and text.

```tsx
import { DialogueBox } from '@doodle-engine/react'

<DialogueBox dialogue={snapshot.dialogue} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogue` | `SnapshotDialogue` | required | Current dialogue data |
| `className` | `string` | `''` | CSS class |

## ChoiceList

Displays available dialogue choices as clickable buttons.

```tsx
import { ChoiceList } from '@doodle-engine/react'

<ChoiceList
  choices={snapshot.choices}
  onSelectChoice={actions.selectChoice}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `choices` | `SnapshotChoice[]` | required | Available choices |
| `onSelectChoice` | `(choiceId: string) => void` | required | Choice selection handler |
| `className` | `string` | `''` | CSS class |

## LocationView

Displays the current location with banner image, name, and description.

```tsx
import { LocationView } from '@doodle-engine/react'

<LocationView location={snapshot.location} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `location` | `SnapshotLocation` | required | Location data |
| `className` | `string` | `''` | CSS class |

## CharacterList

Displays characters at the current location as clickable cards with portraits.

```tsx
import { CharacterList } from '@doodle-engine/react'

<CharacterList
  characters={snapshot.charactersHere}
  onTalkTo={actions.talkTo}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `characters` | `SnapshotCharacter[]` | required | Characters to display |
| `onTalkTo` | `(characterId: string) => void` | required | Talk handler |
| `className` | `string` | `''` | CSS class |

## MapView

Displays the map with clickable location markers.

```tsx
import { MapView } from '@doodle-engine/react'

<MapView map={snapshot.map} onTravelTo={actions.travelTo} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `map` | `SnapshotMap \| null` | required | Map data (null hides component) |
| `onTravelTo` | `(locationId: string) => void` | required | Travel handler |
| `className` | `string` | `''` | CSS class |

## Inventory

Displays the player's items in a grid with click-to-inspect modal.

```tsx
import { Inventory } from '@doodle-engine/react'

<Inventory items={snapshot.inventory} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `SnapshotItem[]` | required | Inventory items |
| `className` | `string` | `''` | CSS class |

### Features

- Grid layout with item icons
- Click an item to open inspection modal
- Modal shows full image, name, description, and close button
- Click overlay or close button to dismiss

## Journal

Displays active quests and unlocked journal entries.

```tsx
import { Journal } from '@doodle-engine/react'

<Journal quests={snapshot.quests} entries={snapshot.journal} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `quests` | `SnapshotQuest[]` | required | Active quests |
| `entries` | `SnapshotJournalEntry[]` | required | Unlocked journal entries |
| `className` | `string` | `''` | CSS class |

### Layout

- Quests shown first with name, description, and current stage
- Journal entries shown below, with category used as CSS class (`journal-category-{category}`)

## NotificationArea

Displays transient notifications.

```tsx
import { NotificationArea } from '@doodle-engine/react'

<NotificationArea notifications={snapshot.notifications} />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notifications` | `string[]` | required | Notification messages |
| `className` | `string` | `''` | CSS class |

Notifications are transient. They appear in one snapshot and are automatically cleared by the engine.

## SaveLoadPanel

Save and load game state via localStorage.

```tsx
import { SaveLoadPanel } from '@doodle-engine/react'

<SaveLoadPanel
  onSave={actions.saveGame}
  onLoad={actions.loadGame}
  storageKey="my-game-save"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSave` | `() => SaveData` | required | Save handler |
| `onLoad` | `(saveData: SaveData) => void` | required | Load handler |
| `storageKey` | `string` | `'doodle-engine-save'` | localStorage key |
| `className` | `string` | `''` | CSS class |

### Features

- Save button serializes to localStorage
- Load button disabled when no save exists
- Shows temporary "Saved!" / "Loaded!" / "No save found" feedback

## VideoPlayer

Fullscreen video/cutscene overlay with a visible Skip button. Also supports skip via keypress (Escape, Space, Enter).

```tsx
import { VideoPlayer } from '@doodle-engine/react'

<VideoPlayer
  src="intro_cinematic.mp4"
  basePath="/video"
  onComplete={() => console.log('Video done')}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Video file name |
| `basePath` | `string` | `'/video'` | Base path for video files |
| `onComplete` | `() => void` | required | Called when video ends or is skipped |
| `className` | `string` | `''` | CSS class |

## SplashScreen

Brief logo/loading screen that auto-advances after a duration.

```tsx
import { SplashScreen } from '@doodle-engine/react'

<SplashScreen
  logoSrc="/images/logo.png"
  title="My Game"
  onComplete={() => setScreen('title')}
  duration={2000}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logoSrc` | `string` | — | Logo image source |
| `title` | `string` | — | Game title text |
| `onComplete` | `() => void` | required | Called when splash finishes |
| `duration` | `number` | `2000` | Auto-advance time in ms |
| `className` | `string` | `''` | CSS class |

Click anywhere to skip the splash screen.

## TitleScreen

Main menu with New Game, Continue, and Settings buttons.

```tsx
import { TitleScreen } from '@doodle-engine/react'

<TitleScreen
  title="My Game"
  subtitle="A text-based adventure"
  hasSaveData={true}
  onNewGame={handleNewGame}
  onContinue={handleContinue}
  onSettings={handleSettings}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Doodle Engine'` | Game title |
| `subtitle` | `string` | — | Subtitle text |
| `logoSrc` | `string` | — | Logo image source |
| `hasSaveData` | `boolean` | required | Whether Continue button is shown |
| `onNewGame` | `() => void` | required | New Game handler |
| `onContinue` | `() => void` | required | Continue handler |
| `onSettings` | `() => void` | required | Settings handler |
| `className` | `string` | `''` | CSS class |

## PauseMenu

In-game overlay with Resume, Save, Load, Settings, and Quit to Title buttons.

```tsx
import { PauseMenu } from '@doodle-engine/react'

<PauseMenu
  onResume={handleResume}
  onSave={handleSave}
  onLoad={handleLoad}
  onSettings={handleSettings}
  onQuitToTitle={handleQuit}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onResume` | `() => void` | required | Resume gameplay |
| `onSave` | `() => void` | required | Save game |
| `onLoad` | `() => void` | required | Load saved game |
| `onSettings` | `() => void` | required | Open settings |
| `onQuitToTitle` | `() => void` | required | Quit to title screen |
| `className` | `string` | `''` | CSS class |

## SettingsPanel

Settings UI with volume sliders and language selection.

```tsx
import { SettingsPanel } from '@doodle-engine/react'

<SettingsPanel
  audioControls={audioControls}
  uiSoundControls={uiSoundControls}
  availableLocales={[{ code: 'en', label: 'English' }]}
  onLocaleChange={actions.setLocale}
  onBack={handleBack}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `audioControls` | `object` | required | Audio volume setters |
| `uiSoundControls` | `UISoundControls` | — | UI sound controls |
| `availableLocales` | `{ code: string; label: string }[]` | — | Language options |
| `currentLocale` | `string` | — | Current language code |
| `onLocaleChange` | `(locale: string) => void` | — | Language change handler |
| `onBack` | `() => void` | required | Back/close handler |
| `className` | `string` | `''` | CSS class |

## GameShell

Complete game wrapper that manages the full lifecycle: splash screen → title screen → gameplay, with pause menu, settings, and video playback built in.

```tsx
import { GameShell } from '@doodle-engine/react'

<GameShell
  registry={registry}
  config={config}
  title="My Game"
  subtitle="A text-based adventure"
  splashDuration={2000}
  availableLocales={[{ code: 'en', label: 'English' }]}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `registry` | `ContentRegistry` | required | Content registry from `/api/content` |
| `config` | `GameConfig` | required | Game config from `/api/content` |
| `title` | `string` | `'Doodle Engine'` | Game title |
| `subtitle` | `string` | — | Subtitle text |
| `logoSrc` | `string` | — | Logo/splash image |
| `splashDuration` | `number` | `2000` | Splash screen duration (0 to skip) |
| `uiSounds` | `UISoundConfig \| false` | — | UI sound config, or `false` to disable |
| `audioOptions` | `AudioManagerOptions` | — | Game audio options |
| `storageKey` | `string` | `'doodle-engine-save'` | localStorage key for saves |
| `availableLocales` | `{ code: string; label: string }[]` | — | Language options for settings |
| `videoBasePath` | `string` | `'/video'` | Base path for video files |
| `className` | `string` | `''` | CSS class |

### Features

- Splash screen with logo and auto-advance
- Title screen with New Game, Continue (if save exists), Settings
- In-game pause menu (Menu button or Escape key)
- Settings panel with volume sliders and language select
- Automatic video/cutscene playback from `pendingVideo`
- Save/load via localStorage
- UI click sounds (configurable)
