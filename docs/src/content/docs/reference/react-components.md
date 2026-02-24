---
title: React Components
description: Reference for all React components and their props.
---

All components are exported from `@doodle-engine/react`.

## GameProvider

Context provider that wraps the game UI. Holds the engine instance and manages state updates.

```tsx
import { GameProvider } from '@doodle-engine/react';

<GameProvider engine={engine} initialSnapshot={snapshot}>
    {children}
</GameProvider>;
```

### Props

| Prop              | Type        | Default  | Description                                                     |
| ----------------- | ----------- | -------- | --------------------------------------------------------------- |
| `engine`          | `Engine`    | required | Engine instance (already initialized)                           |
| `initialSnapshot` | `Snapshot`  | required | Initial snapshot (from `newGame` or `loadGame`)                 |
| `children`        | `ReactNode` | required | Child components                                                |
| `devTools`        | `boolean`   | `false`  | Enable `window.doodle` console API. Pass `import.meta.env.DEV`. |

### Context Value

```typescript
interface GameContextValue {
    snapshot: Snapshot;
    actions: {
        selectChoice: (choiceId: string) => void;
        talkTo: (characterId: string) => void;
        takeItem: (itemId: string) => void;
        travelTo: (locationId: string) => void;
        writeNote: (title: string, text: string) => void;
        deleteNote: (noteId: string) => void;
        setLocale: (locale: string) => void;
        saveGame: () => SaveData;
        loadGame: (saveData: SaveData) => void;
        dismissInterlude: () => void;
    };
}
```

Access via `useGame()` hook.

## GameRenderer

Batteries-included full-screen renderer. Provides a complete game UI with all components pre-wired.

```tsx
import { GameRenderer } from '@doodle-engine/react';

<GameProvider engine={engine} initialSnapshot={snapshot}>
    <GameRenderer className="my-game" />
</GameProvider>;
```

### Props

| Prop        | Type     | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `className` | `string` | `''`    | CSS class   |

### Layout

- **Main area**: Location view with banner, dialogue box, choices, or character list
- **Sidebar** (right): Party portraits and resources (visible variables)
- **Bottom bar**: Inventory, Journal, Map, and Save/Load. Each opens a panel overlay

### Features

- Auto-filters underscore-prefixed variables from the Resources panel
- Integrates `useAudioManager` for automatic audio playback
- Shows notifications as transient overlays

## DialogueBox

Displays the current dialogue node with speaker name, portrait, and text.

```tsx
import { DialogueBox } from '@doodle-engine/react';

<DialogueBox dialogue={snapshot.dialogue} />;
```

### Props

| Prop        | Type               | Default  | Description           |
| ----------- | ------------------ | -------- | --------------------- |
| `dialogue`  | `SnapshotDialogue` | required | Current dialogue data |
| `className` | `string`           | `''`     | CSS class             |

## ChoiceList

Displays available dialogue choices as clickable buttons.

```tsx
import { ChoiceList } from '@doodle-engine/react';

<ChoiceList choices={snapshot.choices} onSelectChoice={actions.selectChoice} />;
```

### Props

| Prop             | Type                         | Default  | Description              |
| ---------------- | ---------------------------- | -------- | ------------------------ |
| `choices`        | `SnapshotChoice[]`           | required | Available choices        |
| `onSelectChoice` | `(choiceId: string) => void` | required | Choice selection handler |
| `className`      | `string`                     | `''`     | CSS class                |

## LocationView

Displays the current location with banner image, name, and description.

```tsx
import { LocationView } from '@doodle-engine/react';

<LocationView location={snapshot.location} />;
```

### Props

| Prop        | Type               | Default  | Description   |
| ----------- | ------------------ | -------- | ------------- |
| `location`  | `SnapshotLocation` | required | Location data |
| `className` | `string`           | `''`     | CSS class     |

## CharacterList

Displays characters at the current location as clickable cards with portraits.

```tsx
import { CharacterList } from '@doodle-engine/react';

<CharacterList
    characters={snapshot.charactersHere}
    onTalkTo={actions.talkTo}
/>;
```

### Props

| Prop         | Type                            | Default  | Description           |
| ------------ | ------------------------------- | -------- | --------------------- |
| `characters` | `SnapshotCharacter[]`           | required | Characters to display |
| `onTalkTo`   | `(characterId: string) => void` | required | Talk handler          |
| `className`  | `string`                        | `''`     | CSS class             |

## GameTime

Displays the current in-game time.

```tsx
import { GameTime } from '@doodle-engine/react';

<GameTime time={snapshot.time} format="narrative" />;
```

### Props

| Prop        | Type                                          | Default     | Description       |
| ----------- | --------------------------------------------- | ----------- | ----------------- |
| `time`      | `{ day: number; hour: number }`               | required    | Time from snapshot |
| `format`    | `'numeric' \| 'narrative' \| 'short'`         | `'numeric'` | Display format    |
| `className` | `string`                                      | `''`        | CSS class         |

### Formats

- **numeric**: "Day 3, 14:00"
- **narrative**: "Day 3, Afternoon"
- **short**: "D3 14:00"

The narrative format uses these time-of-day labels: Dawn (5–7), Morning (8–11), Midday (12–13), Afternoon (14–16), Evening (17–19), Dusk (20–21), Night (22–4).

## MapView

Displays the map with clickable location markers.

```tsx
import { MapView } from '@doodle-engine/react';

<MapView
    map={snapshot.map}
    currentLocation={snapshot.location.id}
    onTravelTo={actions.travelTo}
/>;
```

### Props

| Prop              | Type                           | Default  | Description                                        |
| ----------------- | ------------------------------ | -------- | -------------------------------------------------- |
| `map`             | `SnapshotMap \| null`          | required | Map data (null hides component)                    |
| `currentLocation` | `string`                       | —        | Current location ID for distance calculation       |
| `currentTime`     | `{ day: number; hour: number}` | —        | Current time for arrival calculation               |
| `onTravelTo`      | `(locationId: string) => void` | required | Travel handler                                     |
| `confirmTravel`   | `boolean`                      | `true`   | Show confirmation dialog before travel             |
| `className`       | `string`                       | `''`     | CSS class                                          |

When `confirmTravel` is `true` and the player clicks a location, a dialog shows the destination name and estimated journey time before any travel occurs. If `currentTime` is provided, the dialog also shows the expected arrival time. If `currentLocation` is not provided, the dialog skips the time estimate and just asks for confirmation. Travel time display is approximate — the engine applies its own time advancement rules when `travelTo` is called.

## Inventory

Displays the player's items in a grid with click-to-inspect modal.

```tsx
import { Inventory } from '@doodle-engine/react';

<Inventory items={snapshot.inventory} />;
```

### Props

| Prop        | Type             | Default  | Description     |
| ----------- | ---------------- | -------- | --------------- |
| `items`     | `SnapshotItem[]` | required | Inventory items |
| `className` | `string`         | `''`     | CSS class       |

### Features

- Grid layout with item icons
- Click an item to open inspection modal
- Modal shows full image, name, description, and close button
- Click overlay or close button to dismiss

## Journal

Displays active quests and unlocked journal entries.

```tsx
import { Journal } from '@doodle-engine/react';

<Journal quests={snapshot.quests} entries={snapshot.journal} />;
```

### Props

| Prop        | Type                     | Default  | Description              |
| ----------- | ------------------------ | -------- | ------------------------ |
| `quests`    | `SnapshotQuest[]`        | required | Active quests            |
| `entries`   | `SnapshotJournalEntry[]` | required | Unlocked journal entries |
| `className` | `string`                 | `''`     | CSS class                |

### Layout

- Quests shown first with name, description, and current stage
- Journal entries shown below, with category used as CSS class (`journal-category-{category}`)

## NotificationArea

Displays transient notifications.

```tsx
import { NotificationArea } from '@doodle-engine/react';

<NotificationArea notifications={snapshot.notifications} />;
```

### Props

| Prop            | Type       | Default  | Description           |
| --------------- | ---------- | -------- | --------------------- |
| `notifications` | `string[]` | required | Notification messages |
| `className`     | `string`   | `''`     | CSS class             |

Notifications are transient. They appear in one snapshot and are automatically cleared by the engine.

## SaveLoadPanel

Save and load game state via localStorage.

```tsx
import { SaveLoadPanel } from '@doodle-engine/react';

<SaveLoadPanel
    onSave={actions.saveGame}
    onLoad={actions.loadGame}
    storageKey="my-game-save"
/>;
```

### Props

| Prop         | Type                           | Default                | Description      |
| ------------ | ------------------------------ | ---------------------- | ---------------- |
| `onSave`     | `() => SaveData`               | required               | Save handler     |
| `onLoad`     | `(saveData: SaveData) => void` | required               | Load handler     |
| `storageKey` | `string`                       | `'doodle-engine-save'` | localStorage key |
| `className`  | `string`                       | `''`                   | CSS class        |

### Features

- Save button serializes to localStorage
- Load button disabled when no save exists
- Shows temporary "Saved!" / "Loaded!" / "No save found" feedback

## Interlude

Full-screen narrative text scene (chapter card, dream sequence, etc.). Displays a background image with auto-scrolling text. Handled automatically by `GameRenderer` and `GameShell`. Use this only when building a custom renderer.

```tsx
import { Interlude } from '@doodle-engine/react';

<Interlude
    interlude={snapshot.pendingInterlude}
    onDismiss={actions.dismissInterlude}
/>;
```

### Props

| Prop        | Type                | Description                                      |
| ----------- | ------------------- | ------------------------------------------------ |
| `interlude` | `SnapshotInterlude` | Interlude data from the snapshot                 |
| `onDismiss` | `() => void`        | Called when the player skips or finishes reading |

The player can dismiss via click, Skip button, Space, Enter, or Escape. Mouse wheel and arrow keys scroll manually and pause auto-scroll.

## VideoPlayer

Fullscreen video/cutscene overlay with a visible Skip button. Also supports skip via keypress (Escape, Space, Enter).

```tsx
import { VideoPlayer } from '@doodle-engine/react';

<VideoPlayer
    src="intro_cinematic.mp4"
    basePath="/video"
    onComplete={() => console.log('Video done')}
/>;
```

### Props

| Prop         | Type         | Default    | Description                          |
| ------------ | ------------ | ---------- | ------------------------------------ |
| `src`        | `string`     | required   | Video file name                      |
| `basePath`   | `string`     | `'/video'` | Base path for video files            |
| `onComplete` | `() => void` | required   | Called when video ends or is skipped |
| `className`  | `string`     | `''`       | CSS class                            |

## LoadingScreen

Progress screen displayed while game assets load. Used as the default `renderLoading` UI inside `GameShell` and `AssetProvider`.

```tsx
import { LoadingScreen } from '@doodle-engine/react'

<GameShell
  renderLoading={(state) => (
    <LoadingScreen state={state} background="/assets/images/loading-bg.jpg" />
  )}
  ...
/>
```

### Props

| Prop             | Type                                             | Default  | Description                                            |
| ---------------- | ------------------------------------------------ | -------- | ------------------------------------------------------ |
| `state`          | `AssetLoadingState`                              | required | Loading state from `AssetProvider`                     |
| `background`     | `string`                                         | —        | Background image URL (from `shell.loading.background`) |
| `renderProgress` | `(progress: number, phase: string) => ReactNode` | —        | Custom progress bar renderer                           |
| `className`      | `string`                                         | `''`     | CSS class                                              |

Style it by targeting `.loading-screen`, `.loading-screen-content`, `.loading-screen-spinner`, `.loading-screen-phase`, `.loading-screen-percent`, `.loading-screen-bar-track`, and `.loading-screen-bar-fill` in your CSS.

## SplashScreen

Brief studio/logo screen that auto-advances. Assets and duration come from `config.shell.splash` in `game.yaml`.

```tsx
import { SplashScreen } from '@doodle-engine/react';

<SplashScreen
    shell={config.shell?.splash}
    onComplete={() => setScreen('title')}
/>;
```

### Props

| Prop         | Type                    | Default  | Description                    |
| ------------ | ----------------------- | -------- | ------------------------------ |
| `shell`      | `ShellConfig['splash']` | —        | Splash config from `game.yaml` |
| `onComplete` | `() => void`            | required | Called when splash finishes    |
| `className`  | `string`                | `''`     | CSS class                      |

Duration defaults to `2000ms` if not set in `shell.duration`. Click anywhere to skip.

The `shell` config fields:

| Field        | Type     | Description                              |
| ------------ | -------- | ---------------------------------------- |
| `logo`       | `string` | Logo image path                          |
| `background` | `string` | Background image path                    |
| `sound`      | `string` | Sound effect played on enter             |
| `duration`   | `number` | Auto-advance time in ms (default `2000`) |

## TitleScreen

Main menu with New Game, Continue, and Settings buttons.

```tsx
import { TitleScreen } from '@doodle-engine/react';

<TitleScreen
    title="My Game"
    subtitle="A text-based adventure"
    hasSaveData={true}
    onNewGame={handleNewGame}
    onContinue={handleContinue}
    onSettings={handleSettings}
/>;
```

### Props

| Prop          | Type                   | Default           | Description                          |
| ------------- | ---------------------- | ----------------- | ------------------------------------ |
| `shell`       | `ShellConfig['title']` | —                 | Title config from `game.yaml`        |
| `title`       | `string`               | `'Doodle Engine'` | Game title text (shown when no logo) |
| `subtitle`    | `string`               | —                 | Subtitle text                        |
| `hasSaveData` | `boolean`              | required          | Whether Continue button is shown     |
| `onNewGame`   | `() => void`           | required          | New Game handler                     |
| `onContinue`  | `() => void`           | required          | Continue handler                     |
| `onSettings`  | `() => void`           | required          | Settings handler                     |
| `className`   | `string`               | `''`              | CSS class                            |

## PauseMenu

In-game overlay with Resume, Save, Load, Settings, and Quit to Title buttons.

```tsx
import { PauseMenu } from '@doodle-engine/react';

<PauseMenu
    onResume={handleResume}
    onSave={handleSave}
    onLoad={handleLoad}
    onSettings={handleSettings}
    onQuitToTitle={handleQuit}
/>;
```

### Props

| Prop            | Type         | Default  | Description          |
| --------------- | ------------ | -------- | -------------------- |
| `onResume`      | `() => void` | required | Resume gameplay      |
| `onSave`        | `() => void` | required | Save game            |
| `onLoad`        | `() => void` | required | Load saved game      |
| `onSettings`    | `() => void` | required | Open settings        |
| `onQuitToTitle` | `() => void` | required | Quit to title screen |
| `className`     | `string`     | `''`     | CSS class            |

## SettingsPanel

Settings UI with volume sliders and language selection.

```tsx
import { SettingsPanel } from '@doodle-engine/react';

<SettingsPanel
    audioControls={audioControls}
    uiSoundControls={uiSoundControls}
    availableLocales={[{ code: 'en', label: 'English' }]}
    onLocaleChange={actions.setLocale}
    onBack={handleBack}
/>;
```

### Props

| Prop               | Type                                | Default  | Description             |
| ------------------ | ----------------------------------- | -------- | ----------------------- |
| `audioControls`    | `object`                            | required | Audio volume setters    |
| `uiSoundControls`  | `UISoundControls`                   | —        | UI sound controls       |
| `availableLocales` | `{ code: string; label: string }[]` | —        | Language options        |
| `currentLocale`    | `string`                            | —        | Current language code   |
| `onLocaleChange`   | `(locale: string) => void`          | —        | Language change handler |
| `onBack`           | `() => void`                        | required | Back/close handler      |
| `className`        | `string`                            | `''`     | CSS class               |

## GameShell

Complete game wrapper that manages the full lifecycle: splash screen → title screen → gameplay, with pause menu, settings, and video playback built in.

```tsx
import { GameShell } from '@doodle-engine/react';

<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    title="My Game"
    subtitle="A text-based adventure"
    availableLocales={[{ code: 'en', label: 'English' }]}
    devTools={import.meta.env.DEV}
/>;
```

### Props

| Prop               | Type                                      | Default                | Description                                                     |
| ------------------ | ----------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| `registry`         | `ContentRegistry`                         | required               | Content registry from `/api/content`                            |
| `config`           | `GameConfig`                              | required               | Game config from `/api/content`                                 |
| `manifest`         | `AssetManifest`                           | required               | Asset manifest from `/api/manifest`                             |
| `assetLoader`      | `AssetLoader`                             | —                      | Custom asset loader (for non-browser environments)              |
| `title`            | `string`                                  | `'Doodle Engine'`      | Game title text                                                 |
| `subtitle`         | `string`                                  | —                      | Subtitle text                                                   |
| `uiSounds`         | `UISoundConfig \| false`                  | —                      | UI sound config, or `false` to disable                          |
| `audioOptions`     | `AudioManagerOptions`                     | —                      | Game audio options                                              |
| `storageKey`       | `string`                                  | `'doodle-engine-save'` | localStorage key for saves                                      |
| `availableLocales` | `{ code: string; label: string }[]`       | —                      | Language options for settings                                   |
| `videoBasePath`    | `string`                                  | `'/video'`             | Base path for video files                                       |
| `className`        | `string`                                  | `''`                   | CSS class                                                       |
| `renderLoading`    | `(state: AssetLoadingState) => ReactNode` | —                      | Override the loading screen                                     |
| `devTools`         | `boolean`                                 | `false`                | Enable `window.doodle` console API. Pass `import.meta.env.DEV`. |

Splash screen, loading background, title logo, and UI sounds are configured in `game.yaml` under `shell:`. See [Asset Loading](/technical/asset-loading/) for the full shell config reference.

### Features

- Asset loading with progress screen before any game content renders
- Splash screen (shown when `config.shell.splash` is configured)
- Title screen with New Game, Continue (if save exists), Settings
- In-game pause menu (Menu button or Escape key)
- Settings panel with volume sliders and language select
- Automatic video/cutscene playback from `pendingVideo`
- Save/load via localStorage
- UI click sounds (configurable)
