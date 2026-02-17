---
title: Hosting & Deployment
description: How to build and deploy your Doodle Engine game.
---

Doodle Engine games are standard web applications. The build output is static HTML, CSS, and JavaScript that can be hosted anywhere.

## Building for Production

```bash
npm run build        # or: yarn build / pnpm build
```

This produces a `dist/` directory containing:
- `index.html`: entry point
- `assets/`: bundled JavaScript and CSS
- Any static files from your project root (images, audio, video)

## Static Hosting

The build output is fully static — upload the `dist/` folder to any static host. Most hosts need:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

For **itch.io**: zip the contents of `dist/` and upload as an HTML5 game project.

## Asset Hosting

For small games, bundle everything in `dist/`. For games with large media files, host audio and video on a CDN and configure the base paths:

```tsx
<GameShell
  audioOptions={{ audioBasePath: 'https://cdn.example.com/audio' }}
  videoBasePath="https://cdn.example.com/video"
/>
```

## Desktop Packaging

Doodle Engine games can be packaged as desktop applications using standard web-to-desktop wrappers. No special engine configuration is needed.

**[Electron](https://www.electronjs.org/)** — wraps your game in a Chromium window:
1. Build with `npm run build`
2. Create an Electron main process that loads `dist/index.html`
3. Package with `electron-builder` or `electron-forge`

**[Tauri](https://tauri.app/)** — lighter alternative using the system webview:
1. Build with `npm run build`
2. Point Tauri's `devPath` at your `dist/` directory
3. Build with `tauri build`
