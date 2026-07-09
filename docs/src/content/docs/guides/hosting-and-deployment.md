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
- `assets/`: bundled JavaScript/CSS plus copied game images, audio, and video
- `api/content`: game content data
- `api/manifest`: asset manifest
- `asset-manifest.json`: human-readable asset manifest
- `sw.js`: service worker for offline play

Game assets from your project root `assets/` folder are copied into `dist/assets/` during `npm run build`. When you upload to a static host, upload the full `dist/` folder.

## Static Hosting

The build output is fully static. Upload the `dist/` folder to any static host. Most hosts need:

- **Build command**: `npm run build`
- **Publish directory**: `dist`

For **itch.io**: zip the contents of `dist/` and upload as an HTML5 game project.

## Desktop Packaging

Doodle Engine games can be packaged as desktop applications using standard web-to-desktop wrappers. No special engine configuration is needed.

**[Electron](https://www.electronjs.org/)**: wraps your game in a Chromium window:

1. Build with `npm run build`
2. Create an Electron main process that loads `dist/index.html`
3. Package with `electron-builder` or `electron-forge`

**[Tauri](https://tauri.app/)**: lighter alternative using the system webview:

1. Build with `npm run build`
2. Point Tauri's `devPath` at your `dist/` directory
3. Build with `tauri build`

## Mobile Packaging

The build output is a standard web application, so it can also be wrapped for mobile distribution using web-to-native tools. The general approach is the same: build with `npm run build`, then configure the wrapper to load your `dist/` directory as its web content.

Most tools in this space (such as Capacitor or Cordova-based solutions) follow a similar pattern:

1. Build your game with `npm run build`
2. Configure the mobile wrapper to use `dist/` as its web root
3. Build and sign for iOS or Android through the wrapper's toolchain

Check the documentation for whichever tool you choose, as setup steps and platform requirements vary.
