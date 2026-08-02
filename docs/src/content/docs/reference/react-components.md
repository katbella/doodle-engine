---
title: React Components
description: Reference for Doodle Engine's React renderer components and their props.
---

All components are exported from `@doodle-engine/react`. A prop is a setting passed to a React component.

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

Child components access the current snapshot and player actions through `useGame()`. See the [`useGame` hook reference](/reference/react-hooks/#usegame) for the complete context value and action list.

## InputProvider

`InputProvider` listens for keyboard input and sends commands to registered
handlers in priority order. `GameShell` includes it automatically. A standalone
`GameRenderer` also creates one for its child components.

```tsx
import { InputProvider } from '@doodle-engine/react';

<InputProvider>
    <GameProvider engine={engine} initialSnapshot={snapshot}>
        {children}
    </GameProvider>
</InputProvider>;
```

Use `useInputAction()` to register command handlers. Higher-priority handlers
receive commands first. Returning `true` consumes the command, which stops it
from reaching lower-priority handlers.

## GameRenderer

Built-in full-screen renderer that assembles the location view, dialogue, sidebar, and game panels.

```tsx
import { GameRenderer } from '@doodle-engine/react';
import { PROJECT_ID } from './project';

<GameProvider engine={engine} initialSnapshot={snapshot}>
    <GameRenderer projectId={PROJECT_ID} className="my-game" />
</GameProvider>;
```

### Props

| Prop            | Type         | Default     | Description                                         |
| --------------- | ------------ | ----------- | --------------------------------------------------- |
| `projectId`     | `string`     | required    | Stable ID from the generated `project.ts`           |
| `className`     | `string`     | `''`        | CSS class                                           |
| `onButtonClick` | `() => void` | `undefined` | Called when an enabled game-interface button clicks |

### Layout

- **Main area**: Location view with banner, dialogue box, choices, or character list
- **Sidebar** (right): Party portraits and resources (visible variables)
- **Bottom bar**: Party, Inventory, Journal, Notes, Map, and Save/Load. Each opens a panel overlay

### Requirements

Requires `GameProvider` for snapshot and actions. If `AudioSettingsProvider` is present in the tree, a Settings button appears in the bottom bar with volume sliders. Without the provider, the settings button is hidden.

When used inside `GameShell`, both providers are already set up. When used standalone, wrap in `AudioSettingsProvider` if you want the built-in settings panel.

### Features

- Auto-filters underscore-prefixed variables from the Resources panel
- Shows the player and current party members in a cycling character sheet
- Collects the player name, title, and biography when `game.yaml` enables `playerCreatesProfile`
- Shows notifications as transient overlays
- Settings panel with volume controls (requires `AudioSettingsProvider`)

## DialogueBox

Displays the current dialogue node with speaker name, portrait, and text.
It renders the DSL's bold, italic, and color syntax without interpreting HTML.

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

Displays available dialogue choices as clickable buttons. When there are no choices, renders a Continue button instead.

```tsx
import { ChoiceList } from '@doodle-engine/react';

<ChoiceList
    choices={snapshot.choices}
    onSelectChoice={actions.selectChoice}
    onContinue={actions.continueDialogue}
    continueLabel={snapshot.ui['ui.continue']}
/>;
```

### Props

| Prop             | Type                         | Default      | Description                        |
| ---------------- | ---------------------------- | ------------ | ---------------------------------- |
| `choices`        | `SnapshotChoice[]`           | required     | Available choices                  |
| `onSelectChoice` | `(choiceId: string) => void` | required     | Choice selection handler           |
| `onContinue`     | `() => void`                 | required     | Called when player clicks Continue |
| `continueLabel`  | `string`                     | `'Continue'` | Label for the Continue button      |
| `className`      | `string`                     | `''`         | CSS class                          |

Number keys 1–9 select choices by position. Enter and Space trigger the Continue button when it is shown.
These shortcuts are routed through `InputProvider`, so higher-priority overlays
such as interludes, videos, and panels can consume input before dialogue sees it.

Choice labels render the same bold, italic, and color syntax as dialogue text.

## FormattedText

Renders one resolved string using the dialogue formatting syntax. Use this
component when a custom React layout displays dialogue text outside
`DialogueBox` or `ChoiceList`.

```tsx
import { FormattedText } from '@doodle-engine/react';

<FormattedText text={snapshot.dialogue.text} />;
```

## LocationView

Displays the current location with banner image, name, and description.

```tsx
import { LocationView } from '@doodle-engine/react';

<LocationView location={snapshot.location} />;
```

### Props

| Prop        | Type                     | Default  | Description         |
| ----------- | ------------------------ | -------- | ------------------- |
| `location`  | `SnapshotLocation`       | required | Location data       |
| `ui`        | `Record<string, string>` | —        | Resolved UI strings |
| `className` | `string`                 | `''`     | CSS class           |

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
| `ui`         | `Record<string, string>`        | —        | Resolved UI strings   |
| `className`  | `string`                        | `''`     | CSS class             |

Selecting a location character calls `onTalkTo`. Character inspection is kept
separate in the built-in renderer's Party panel.

## CharacterSheet

Displays one player or party-member profile with portrait, name, title,
biography, and visible stats. Stat keys beginning with `_` are omitted.

```tsx
import { CharacterSheet } from '@doodle-engine/react';

<CharacterSheet
    ui={snapshot.ui}
    character={snapshot.player}
    position={0}
    count={snapshot.party.length + 1}
    onPrevious={showPrevious}
    onNext={showNext}
/>;
```

| Prop         | Type                                           | Default  | Description                  |
| ------------ | ---------------------------------------------- | -------- | ---------------------------- |
| `ui`         | `Record<string, string>`                       | `{}`     | Resolved UI strings          |
| `character`  | `SnapshotCharacter \| SnapshotPlayerCharacter` | required | Profile to display           |
| `position`   | `number`                                       | required | Zero-based position          |
| `count`      | `number`                                       | required | Number of available profiles |
| `onPrevious` | `() => void`                                   | required | Previous-profile handler     |
| `onNext`     | `() => void`                                   | required | Next-profile handler         |

## PlayerSetup

Displays the non-dismissible start modal for a player-created profile. Name is
required, and title and biography are optional. The component deliberately has
no portrait input.

```tsx
import { PlayerSetup } from '@doodle-engine/react';

<PlayerSetup ui={snapshot.ui} onSubmit={actions.setPlayerProfile} />;
```

| Prop       | Type                                    | Default  | Description               |
| ---------- | --------------------------------------- | -------- | ------------------------- |
| `ui`       | `Record<string, string>`                | `{}`     | Resolved UI strings       |
| `onSubmit` | `(profile: PlayerProfileInput) => void` | required | Completed-profile handler |

The component uses the localized `ui.player_name`, `ui.player_title`, and
`ui.player_biography` strings for its persistent labels and input hints.

## PlayerEmblem

Renders the built-in generic SVG emblem used when the player has no fixed
portrait.

```tsx
import { PlayerEmblem } from '@doodle-engine/react';

<PlayerEmblem className="my-player-emblem" />;
```

| Prop        | Type     | Default           | Description |
| ----------- | -------- | ----------------- | ----------- |
| `className` | `string` | `'player-emblem'` | CSS class   |

## GameTime

Displays the current in-game time.

```tsx
import { GameTime } from '@doodle-engine/react';

<GameTime time={snapshot.time} format="narrative" />;
```

### Props

| Prop        | Type                                  | Default     | Description        |
| ----------- | ------------------------------------- | ----------- | ------------------ |
| `time`      | `{ day: number; hour: number }`       | required    | Time from snapshot  |
| `format`    | `'numeric' \| 'narrative' \| 'short'` | `'numeric'` | Display format      |
| `ui`        | `Record<string, string>`              | —           | Resolved UI strings |
| `className` | `string`                              | `''`        | CSS class           |

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

| Prop              | Type                           | Default  | Description                                  |
| ----------------- | ------------------------------ | -------- | -------------------------------------------- |
| `map`             | `SnapshotMap \| null`          | required | Map data (null hides component)              |
| `currentLocation` | `string`                       | —        | Current location ID for distance calculation |
| `currentTime`     | `{ day: number; hour: number}` | —        | Current time for arrival calculation         |
| `onTravelTo`      | `(locationId: string) => void` | required | Travel handler                               |
| `confirmTravel`   | `boolean`                      | `true`   | Show confirmation dialog before travel       |
| `ui`              | `Record<string, string>`       | —        | Resolved UI strings                          |
| `className`       | `string`                       | `''`     | CSS class                                    |

When `confirmTravel` is `true` and the player clicks a location, a dialog shows the destination name and estimated journey time before any travel occurs. If `currentTime` is provided, the dialog also shows the expected arrival time. If `currentLocation` is not provided, the dialog skips the time estimate and just asks for confirmation. Travel time display is approximate. The engine applies its own time advancement rules when `travelTo` is called.

## Inventory

Displays the player's items in a grid. Selecting an item opens its details.

```tsx
import { Inventory } from '@doodle-engine/react';

<Inventory items={snapshot.inventory} />;
```

### Props

| Prop        | Type                     | Default  | Description         |
| ----------- | ------------------------ | -------- | ------------------- |
| `items`     | `SnapshotItem[]`         | required | Inventory items     |
| `ui`        | `Record<string, string>` | —        | Resolved UI strings |
| `className` | `string`                 | `''`     | CSS class           |

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
| `ui`        | `Record<string, string>` | —        | Resolved UI strings      |
| `className` | `string`                 | `''`     | CSS class                |

### Layout

- Quests shown first with name, description, and current stage
- Journal entries shown below, with category used as CSS class (`journal-category-{category}`)

## PlayerNotes

Displays player-written notes with a form to add new ones and a delete button per note.

```tsx
import { PlayerNotes } from '@doodle-engine/react';

<PlayerNotes
    notes={snapshot.playerNotes}
    onWrite={actions.writeNote}
    onDelete={actions.deleteNote}
/>;
```

### Props

| Prop        | Type                                    | Default  | Description          |
| ----------- | --------------------------------------- | -------- | -------------------- |
| `notes`     | `PlayerNote[]`                          | required | Player-written notes |
| `onWrite`   | `(title: string, text: string) => void` | required | Add note handler     |
| `onDelete`  | `(noteId: string) => void`              | required | Delete note handler  |
| `ui`        | `Record<string, string>`                | —        | Resolved UI strings  |
| `className` | `string`                                | `''`     | CSS class            |

Notes are stored in game state and persisted through save/load.

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

## DialogOverlay

Accessible modal foundation for custom renderer panels. It moves focus into the
dialog, keeps keyboard focus inside it, and restores focus when it closes.

```tsx
import { DialogOverlay } from '@doodle-engine/react';

<DialogOverlay
    ariaLabel="Quest details"
    overlayClassName="quest-dialog-overlay"
    className="quest-dialog"
    onDismiss={closeQuest}
>
    <h2>The Missing Courier</h2>
    <p>Find the courier on the north road.</p>
    <button onClick={closeQuest}>Close</button>
</DialogOverlay>;
```

### Props

| Prop                | Type                             | Default  | Description                              |
| ------------------- | -------------------------------- | -------- | ---------------------------------------- |
| `children`          | `ReactNode`                      | required | Dialog content                           |
| `onDismiss`         | `() => void`                     | required | Close handler                            |
| `ariaLabel`         | `string`                         | required | Accessible name for the dialog           |
| `overlayClassName`  | `string`                         | required | CSS class for the full-screen overlay    |
| `className`         | `string`                         | required | CSS class for the dialog panel           |
| `initialFocusRef`   | `RefObject<HTMLElement \| null>` | —        | Element that receives focus when opened  |
| `dismissOnBackdrop` | `boolean`                        | `true`   | Close when the outer overlay is selected |
| `dismissOnEscape`   | `boolean`                        | `true`   | Close when Escape is pressed             |

## SaveLoadPanel

Save and load game state via localStorage.

```tsx
import { SaveLoadPanel } from '@doodle-engine/react';
import { PROJECT_ID } from './project';

<SaveLoadPanel
    ui={snapshot.ui}
    onSave={actions.saveGame}
    onLoad={actions.loadGame}
    projectId={PROJECT_ID}
/>;
```

### Props

| Prop        | Type                           | Default  | Description                               |
| ----------- | ------------------------------ | -------- | ----------------------------------------- |
| `ui`        | `Record<string, string>`       | required | Resolved UI strings                       |
| `onSave`    | `() => SaveData`               | required | Save handler                              |
| `onLoad`    | `(saveData: SaveData) => void` | required | Load handler                              |
| `projectId` | `string`                       | required | Stable ID from the generated `project.ts` |
| `className` | `string`                       | `''`     | CSS class                                 |

### Features

- Lists quick saves, autosaves, and manual saves for the current project
- **New Save** adds a manual save
- Every slot can be loaded, and manual saves can also be deleted
- Shows temporary saved and loaded feedback

## Interlude

Full-screen narrative scene with scrolling text and optional background art.
`GameRenderer` and `GameShell` display interludes automatically. A custom
renderer can use this component directly.

```tsx
import { Interlude } from '@doodle-engine/react';

<Interlude
    interlude={snapshot.pendingInterlude}
    onDismiss={actions.dismissInterlude}
/>;
```

### Props

| Prop        | Type                     | Default  | Description                                    |
| ----------- | ------------------------ | -------- | ---------------------------------------------- |
| `interlude` | `SnapshotInterlude`      | required | Interlude data from the snapshot               |
| `onDismiss` | `() => void`             | required | Called when the player dismisses the interlude |
| `ui`        | `Record<string, string>` | `{}`     | Resolved UI strings                            |

The player can dismiss with the Skip button, by clicking the outer overlay, or with Space, Enter, or Escape. Mouse wheel and arrow keys scroll manually and pause auto-scroll. Keyboard commands are registered at high priority so the dialogue UI underneath does not also receive the same input.

## VideoPlayer

Fullscreen video/cutscene overlay with a visible Skip button. Also supports skip via keypress (Escape, Space, Enter). Keyboard commands are registered at high priority so the gameplay UI underneath does not also receive the same input.

```tsx
import { VideoPlayer } from '@doodle-engine/react';

<VideoPlayer
    src={snapshot.pendingVideo}
    onComplete={() => console.log('Video done')}
/>;
```

### Props

| Prop         | Type                     | Default  | Description                          |
| ------------ | ------------------------ | -------- | ------------------------------------ |
| `src`        | `string`                 | required | Video file path (resolved by engine) |
| `onComplete` | `() => void`             | required | Called when video ends or is skipped |
| `ui`         | `Record<string, string>` | —        | Resolved UI strings                  |
| `className`  | `string`                 | `''`     | CSS class                            |

## LoadingScreen

Progress screen displayed while game assets load. Used as the default `renderLoading` UI inside `GameShell` and `AssetProvider`.

```tsx
import { LoadingScreen } from '@doodle-engine/react'

<GameShell
  projectId={PROJECT_ID}
  renderLoading={(state) => (
    <LoadingScreen state={state} background="assets/images/loading-bg.jpg" />
  )}
  ...
/>
```

### Props

| Prop             | Type                                             | Default      | Description                                            |
| ---------------- | ------------------------------------------------ | ------------ | ------------------------------------------------------ |
| `state`          | `AssetLoadingState`                              | required     | Loading state from `AssetProvider`                     |
| `background`     | `string`                                         | —            | Background image URL (from `shell.loading.background`) |
| `renderProgress` | `(progress: number, phase: string) => ReactNode` | —            | Custom progress bar renderer                           |
| `ui`             | `Record<string, string>`                         | —            | Resolved UI strings                                    |
| `onStart`        | `() => void`                                     | —            | Show and handle the button when loading is complete    |
| `startLabel`     | `string`                                         | `Start game` | Completed-loading button label                         |
| `className`      | `string`                                         | `''`         | CSS class                                              |

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

| Prop         | Type                     | Default  | Description                     |
| ------------ | ------------------------ | -------- | ------------------------------- |
| `shell`      | `ShellConfig['splash']`  | —        | Splash config from `game.yaml`  |
| `onComplete` | `() => void`             | required | Called when splash finishes     |
| `ui`         | `Record<string, string>` | —        | Resolved UI strings             |
| `volume`     | `number`                 | `0.8`    | Splash sound volume, `0` to `1` |
| `className`  | `string`                 | `''`     | CSS class                       |

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
    ui={snapshot.ui}
    title="My Game"
    subtitle="A text-based adventure"
    hasSaveData={true}
    onNewGame={handleNewGame}
    onContinue={handleContinue}
    onSettings={handleSettings}
/>;
```

### Props

| Prop          | Type                     | Default           | Description                          |
| ------------- | ------------------------ | ----------------- | ------------------------------------ |
| `ui`          | `Record<string, string>` | required          | Resolved UI strings                  |
| `shell`       | `ShellConfig['title']`   | —                 | Title config from `game.yaml`        |
| `title`       | `string`                 | `'Doodle Engine'` | Game title text (shown when no logo) |
| `subtitle`    | `string`                 | —                 | Subtitle text                        |
| `hasSaveData` | `boolean`                | required          | Whether Continue button is shown     |
| `onNewGame`   | `() => void`             | required          | New Game handler                     |
| `onContinue`  | `() => void`             | required          | Continue handler                     |
| `onSettings`  | `() => void`             | required          | Settings handler                     |
| `onCredits`   | `() => void`             | —                 | Credits handler                      |
| `className`   | `string`                 | `''`              | CSS class                            |

## CreditsScreen

Credits page with a heading, game title, Doodle Engine credit, and Back button.
Pass `children` to replace the default credit content.

```tsx
import { CreditsScreen } from '@doodle-engine/react';

<CreditsScreen
    ui={snapshot.ui}
    title="The Lantern at Greywater"
    onBack={showTitle}
/>;
```

### Props

| Prop        | Type                     | Default  | Description                           |
| ----------- | ------------------------ | -------- | ------------------------------------- |
| `ui`        | `Record<string, string>` | required | Resolved UI strings                   |
| `title`     | `string`                 | required | Game title in the default credits     |
| `children`  | `ReactNode`              | —        | Custom content replacing the defaults |
| `onBack`    | `() => void`             | required | Return handler                        |
| `className` | `string`                 | `''`     | CSS class                             |

## PauseMenu

In-game overlay with Resume, Save, Load, Settings, and Quit to Title buttons.

```tsx
import { PauseMenu } from '@doodle-engine/react';

<PauseMenu
    ui={snapshot.ui}
    onResume={handleResume}
    onSave={handleSave}
    onLoad={handleLoad}
    onSettings={handleSettings}
    onQuitToTitle={handleQuit}
/>;
```

### Props

| Prop            | Type                     | Default  | Description          |
| --------------- | ------------------------ | -------- | -------------------- |
| `ui`            | `Record<string, string>` | required | Resolved UI strings  |
| `onResume`      | `() => void`             | required | Resume gameplay      |
| `onSave`        | `() => void`             | required | Save game            |
| `onLoad`        | `() => void`             | required | Load saved game      |
| `canLoad`       | `boolean`                | —        | Disables Load when `false` |
| `onSettings`    | `() => void`             | required | Open settings        |
| `onQuitToTitle` | `() => void`             | required | Quit to title screen |
| `className`     | `string`                 | `''`     | CSS class            |

## SettingsPanel

Settings UI with volume sliders and language selection.

```tsx
import { SettingsPanel, useAudioSettings } from '@doodle-engine/react';

const audioSettings = useAudioSettings();

<SettingsPanel
    audio={audioSettings}
    uiSoundControls={uiSoundControls}
    availableLocales={[{ code: 'en', label: 'English' }]}
    currentLocale={snapshot.currentLocale}
    onLocaleChange={actions.setLocale}
    onBack={handleBack}
/>;
```

### Props

| Prop               | Type                                | Default  | Description               |
| ------------------ | ----------------------------------- | -------- | ------------------------- |
| `audio`            | `SettingsPanelAudio`                | required | Volume values and setters |
| `uiSoundControls`  | `UISoundControls`                   | —        | UI sound controls         |
| `availableLocales` | `{ code: string; label: string }[]` | —        | Language options          |
| `currentLocale`    | `string`                            | —        | Current language code     |
| `onLocaleChange`   | `(locale: string) => void`          | —        | Language change handler   |
| `onBack`           | `() => void`                        | required | Back/close handler        |
| `ui`               | `Record<string, string>`            | —        | Resolved UI strings       |
| `className`        | `string`                            | `''`     | CSS class                 |

`SettingsPanelAudio` has the same shape as `AudioSettings` from `AudioSettingsContext`, so you can pass `useAudioSettings()` directly as the `audio` prop.

## GameShell

Game wrapper that manages loading, the splash and title screens, gameplay, the pause menu, settings, and video playback.

```tsx
import { GameShell } from '@doodle-engine/react';
import { PROJECT_ID } from './project';

<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
    availableLocales={[{ code: 'en', label: 'English' }]}
    devTools={import.meta.env.DEV}
/>;
```

### Props

| Prop               | Type                                      | Default           | Description                                                     |
| ------------------ | ----------------------------------------- | ----------------- | --------------------------------------------------------------- |
| `registry`         | `ContentRegistry`                         | required          | Content registry from `/api/content`                            |
| `config`           | `GameConfig`                              | required          | Game config from `/api/content`                                 |
| `manifest`         | `AssetManifest`                           | required          | Asset manifest from `/api/manifest`                             |
| `projectId`        | `string`                                  | required          | Stable ID from the generated `project.ts`                       |
| `assetLoader`      | `AssetLoader`                             | —                 | Custom asset loader (for non-browser environments)              |
| `credits`          | `ReactNode`                               | —                 | Credits content, replacing the default credit                   |
| `uiSounds`         | `UISoundConfig \| false`                  | —                 | UI sound config, or `false` to disable                          |
| `audioOptions`     | `AudioManagerOptions`                     | —                 | Crossfade duration and other audio config                       |
| `availableLocales` | `{ code: string; label: string }[]`       | —                 | Language options for settings                                   |
| `className`        | `string`                                  | `''`              | CSS class                                                       |
| `renderLoading`    | `(state: AssetLoadingState) => ReactNode` | —                 | Override the loading screen                                     |
| `devTools`         | `boolean`                                 | `false`           | Enable `window.doodle` console API. Pass `import.meta.env.DEV`. |

The title and optional subtitle are configured in `game.yaml`. Splash screen, loading background, title logo, and UI sounds are configured under `shell:`. See [Asset Loading](/technical/asset-loading/) for the full shell config reference.

### Features

- Asset loading with progress screen before any game content renders
- Splash screen (shown when `config.shell.splash` is configured)
- Title screen with New Game, Continue (if save exists), Settings
- In-game pause menu (Menu button or Escape key)
- Settings panel with volume sliders and language select
- Automatic video/cutscene playback from `pendingVideo`
- Save/load via localStorage
- UI click sounds (configurable)
