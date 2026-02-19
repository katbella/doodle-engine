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
- `assets/`: bundled JavaScript and CSS (Vite output)
- `api/content`: game content data
- `api/manifest`: asset manifest
- `asset-manifest.json`: human-readable asset manifest
- `sw.js`: service worker for offline play

Game assets (images, audio, video) from the `assets/` folder in your project root are **not** automatically included in `dist/`. Copy the `assets/` folder into `dist/` before deploying:

```bash
npm run build
cp -r assets dist/assets
```

When you upload to a static host, upload the full `dist/` folder including the copied `assets/` subdirectory.

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
