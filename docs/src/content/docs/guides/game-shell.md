---
title: Game Shell
description: Using GameShell for splash screens, title menus, pause, settings, and video.
---

`GameShell` is a complete game wrapper that handles the full lifecycle: splash screen, title screen, gameplay with pause menu, settings, and video cutscenes.

## Basic Usage

```tsx
import { GameShell } from '@doodle-engine/react';

<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    title="My Game"
    subtitle="A text-based adventure"
/>;
```

This gives you:

- An asset loading screen before any game content renders
- A splash screen (if `shell.splash` is configured in `game.yaml`)
- A title screen with New Game, Continue (if save exists), and Settings
- Full gameplay with `GameRenderer`
- Escape key opens pause menu (Resume, Save, Load, Settings, Quit to Title)
- Automatic save/load via localStorage
- Video cutscene playback from dialogue `VIDEO` effects

## Splash Screen

The splash screen is configured in `content/game.yaml`:

```yaml
shell:
    splash:
        logo: /assets/images/studio-logo.png
        background: /assets/images/splash-bg.jpg
        sound: /assets/audio/splash.ogg
        duration: 2000
```

If `shell.splash` is not defined, the splash screen is skipped and the game goes directly to the title screen. Players can click to skip the splash at any time.

## Title Screen

The title screen shows:

- The logo image (if `shell.title.logo` is configured in `game.yaml`)
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
    manifest={manifest}
    availableLocales={[
        { code: 'en', label: 'English' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
    ]}
/>
```

## UI Sounds

`GameShell` plays sounds for menu interactions (clicks, open/close). Configure or disable them with the `uiSounds` prop:

```tsx
// Custom UI sounds
<GameShell
  uiSounds={{
    basePath: '/assets/audio/ui',
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

To preload UI sounds before the title screen appears, list them in `content/game.yaml` under `shell.uiSounds`:

```yaml
shell:
  uiSounds:
    click: /assets/audio/ui/click.ogg
    menuOpen: /assets/audio/ui/menu_open.ogg
    menuClose: /assets/audio/ui/menu_close.ogg
```

`shell.uiSounds` in `game.yaml` controls **preloading**: it tells the asset loader which files to cache as tier 1 (shell) assets, so they are ready before the title screen renders. The `uiSounds` prop on `GameShell` controls **playback**: it tells the runtime where to find sound files when a button is clicked. The file paths in both must match.

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
        audioBasePath: '/assets/audio',
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
} from '@doodle-engine/react';
```

See [Custom Renderer](/guides/custom-renderer/) for building a fully custom UI, or the [React Components Reference](/reference/react-components/) for individual component props.
