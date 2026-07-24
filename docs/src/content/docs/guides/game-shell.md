---
title: Game Shell
description: Using GameShell for splash screens, title menus, pause, settings, and video.
---

`GameShell` provides the screens and menus around the game, including loading, title, pause, settings, credits, and video playback.

## Basic Usage

```tsx
import { GameShell } from '@doodle-engine/react';
import { PROJECT_ID } from '../project';

<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
    title="My Game"
    subtitle="A text-based adventure"
/>;
```

The `registry` contains the loaded game definitions, `config` contains the starting settings from `game.yaml`, and `manifest` lists the game's media files. These values are props, the settings passed to a React component.

This gives you:

- An asset loading screen before any game content renders
- A splash screen (if `shell.splash` is configured in `game.yaml`)
- A title screen with New Game, Continue (if save exists), and Settings
- A credits screen linked from the title screen
- Full gameplay with `GameRenderer`
- Escape key opens pause menu (Resume, Save, Load, Settings, Quit to Title)
- Automatic save/load through the browser's local storage (`localStorage`)
- Video cutscene playback from dialogue `VIDEO` effects

## Splash Screen

The splash screen is configured in `content/game.yaml`:

```yaml
shell:
    splash:
        logo: assets/images/studio-logo.png
        background: assets/images/splash-bg.jpg
        sound: assets/audio/sfx/splash.ogg
        duration: 2000
```

If `shell.splash` is not defined, the splash screen is skipped and the game goes directly to the title screen. Players can click to skip the splash at any time.

## Title Screen

The title screen shows:

- The logo image (if `shell.title.logo` is configured in `game.yaml`)
- Game title and subtitle
- **New Game** button
- **Continue** button (when a save exists in browser storage)
- **Settings** button
- **Credits** button

Configure title screen music in `content/game.yaml`:

```yaml
shell:
    title:
        logo: assets/images/logo.png
        music: assets/audio/music/main_theme.ogg
```

The music plays on loop while the title screen is visible and stops when the player starts or continues a game.

## Credits Screen

The title screen includes a **Credits** button. By default, the credits screen shows the game title and “Made with Doodle Engine.” Pass the `credits` prop to provide the game’s own credits:

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
    title="Harbor Lights"
    credits={
        <>
            <p>Written and designed by Your Name</p>
            <p>Music by Composer Name</p>
        </>
    }
/>
```

## Pause Menu

During gameplay, click the **Menu** button or press **Escape** to open the pause menu with:

- **Resume**: close the menu
- **Save**: save to browser storage
- **Load**: load from browser storage
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
    projectId={PROJECT_ID}
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
  registry={registry}
  config={config}
  manifest={manifest}
  projectId={PROJECT_ID}
  uiSounds={{
    basePath: 'assets/audio/ui',
    volume: 0.5,
    sounds: {
      click: 'click.ogg',
      menuOpen: 'menu_open.ogg',
      menuClose: 'menu_close.ogg',
    },
  }}
/>

// Disable UI sounds
<GameShell
  registry={registry}
  config={config}
  manifest={manifest}
  projectId={PROJECT_ID}
  uiSounds={false}
/>
```

To preload UI sounds before the title screen appears, list them in `content/game.yaml` under `shell.uiSounds`:

```yaml
shell:
  uiSounds:
    click: assets/audio/ui/click.ogg
    menuOpen: assets/audio/ui/menu_open.ogg
    menuClose: assets/audio/ui/menu_close.ogg
```

`shell.uiSounds` loads these files before the title screen and provides the default sound for each action. Pass the `uiSounds` prop to change the mapping, or `uiSounds={false}` to turn off UI sounds.

## Video Cutscenes

GameShell automatically plays fullscreen video cutscenes when a dialogue uses the `VIDEO` effect. Video files resolve from the engine's normal video asset path.

See [Video & Cutscenes](/guides/video-cutscenes/) for full details on adding videos to your game.

## Save/Load

`GameShell` uses the project’s generated ID to keep its saves separate from other Doodle games:

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
/>
```

Studio and `doodle create` store this ID in `src/project.ts`. Keep it for every release of the same game. A missing, changed, or malformed ID stops save access instead of falling back to shared storage.

## Game Audio

Pass audio options to configure the game audio manager:

```tsx
<GameShell
    registry={registry}
    config={config}
    manifest={manifest}
    projectId={PROJECT_ID}
    audioOptions={{
        masterVolume: 1.0,
        musicVolume: 0.7,
        soundVolume: 0.8,
        voiceVolume: 1.0,
        crossfadeDuration: 1000,
    }}
/>
```

These are the default values. Volume settings are saved to browser storage under `'doodle-engine-audio'` and survive page reloads. The player's last-used settings take precedence over the defaults.

## Styling

When you create a project in Studio, you can include starter styles or begin with minimal CSS:

- **Starter styles**: a dark fantasy theme with warm gold accents, sized layout panels, bottom bar, and panels for inventory, journal, map, and save/load. Everything is defined with CSS custom properties so you can retheme by editing `:root` values in `src/index.css`.
- **Minimal CSS**: a body reset that leaves the visual design to your project.

You can switch at any time by replacing `src/index.css`. The components use class names that describe each part of the interface, such as `.game-renderer`, `.game-layout`, `.game-main`, `.game-sidebar`, `.game-bottom-bar`, `.dialogue-box`, and `.choice-button`.

To retheme the starter styles, override the custom properties:

```css
:root {
    --doodle-accent: #b87333;
    --doodle-bg-primary: #0d1117;
    --doodle-text-primary: #f0e6d3;
}
```

## Compose Individual Components

Use the individual components directly when you want to assemble your own shell:

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

See [Custom Renderer](/technical/custom-renderer/) for building a custom UI, or the [React Components Reference](/reference/react-components/) for individual component props.
