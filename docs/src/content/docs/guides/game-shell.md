---
title: Game Shell
description: Using GameShell for splash screens, title menus, pause, settings, and video.
---

`GameShell` is a complete game wrapper that handles the full lifecycle: splash screen, title screen, gameplay with pause menu, settings, and video cutscenes.

## Basic Usage

```tsx
import { GameShell } from '@doodle-engine/react'

<GameShell
  registry={registry}
  config={config}
  title="My Game"
  subtitle="A text-based adventure"
/>
```

This gives you:
- A 2-second splash screen with your title
- A title screen with New Game, Continue (if save exists), and Settings
- Full gameplay with `GameRenderer`
- Escape key opens pause menu (Resume, Save, Load, Settings, Quit to Title)
- Automatic save/load via localStorage
- Video cutscene playback from dialogue `VIDEO` effects

## Splash Screen

The splash screen shows briefly before the title screen. Configure with:

```tsx
<GameShell
  logoSrc="/images/logo.png"
  title="My Game"
  splashDuration={3000}  // 3 seconds
/>
```

Set `splashDuration={0}` to skip the splash and go directly to the title screen.

Players can click to skip the splash at any time.

## Title Screen

The title screen shows:
- Your logo (if `logoSrc` is provided)
- Game title and subtitle
- **New Game** button
- **Continue** button (only if a save exists in localStorage)
- **Settings** button

## Pause Menu

During gameplay, click the **Menu** button or press **Escape** to open the pause menu with:
- **Resume**: close the menu
- **Save**: save to localStorage
- **Load**: load from localStorage
- **Settings**: open settings panel
- **Quit to Title**: return to title screen

## Settings Panel

The settings panel provides:
- Volume sliders (Master, Music, Sound Effects, Voice, UI)
- Language selection (if `availableLocales` is provided)

```tsx
<GameShell
  registry={registry}
  config={config}
  availableLocales={[
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
  ]}
/>
```

## UI Sounds

GameShell includes UI click sounds for menus. Configure or disable:

```tsx
// Custom UI sounds
<GameShell
  uiSounds={{
    basePath: '/audio/ui',
    volume: 0.5,
    sounds: {
      click: 'click.ogg',
      menuOpen: 'menu_open.ogg',
      menuClose: 'menu_close.ogg',
    },
  }}
/>

// Disable UI sounds
<GameShell uiSounds={false} />
```

## Video Cutscenes

GameShell automatically plays fullscreen video cutscenes when a dialogue uses the `VIDEO` effect. Configure the video file location with `videoBasePath`:

```tsx
<GameShell videoBasePath="/assets/video" />
```

See [Video & Cutscenes](/guides/video-cutscenes/) for full details on adding videos to your game.

## Save/Load

GameShell saves to localStorage under a configurable key:

```tsx
<GameShell storageKey="my-game-save" />
```

The default key is `'doodle-engine-save'`.

## Game Audio

Pass audio options to configure the game audio manager:

```tsx
<GameShell
  audioOptions={{
    audioBasePath: '/audio',
    masterVolume: 1.0,
    musicVolume: 0.7,
    soundVolume: 0.8,
    voiceVolume: 1.0,
  }}
/>
```

## Using Individual Components Instead

If you need more control, you can use the individual components directly instead of `GameShell`:

```tsx
import {
  GameProvider,
  GameRenderer,
  SplashScreen,
  TitleScreen,
  PauseMenu,
  SettingsPanel,
  VideoPlayer,
  useGame,
  useAudioManager,
  useUISounds,
} from '@doodle-engine/react'
```

See [Custom Renderer](/guides/custom-renderer/) for building a fully custom UI, or the [React Components Reference](/reference/react-components/) for individual component props.
