---
title: Hosting & Deployment
description: How to build and deploy your Doodle Engine game.
---

Doodle Engine games are web applications. A production build contains static HTML, CSS, and JavaScript that can be published on a static web host.

## Building for Production

```bash
npm run build        # or: yarn build / pnpm build
```

This produces a `dist/` directory containing:

- `index.html`: entry point
- `assets/`: bundled JavaScript/CSS plus copied game images, audio, and video
- `api/content`: game content data
- `api/manifest`: list of game media used by the application
- `asset-manifest.json`: human-readable copy of that media list
- `sw.js`: service worker, a browser file that caches the game for offline play

Game assets from your project root `assets/` folder are copied into `dist/assets/` during `npm run build`. When you upload to a static host, upload the full `dist/` folder.

The build uses relative URLs throughout, so the same `dist/` works at a
domain root (`https://mygame.example/`) or under a folder
(`https://example.com/games/my-game/`). No configuration is needed for
either.

### Offline play

`sw.js` caches the app, the game content, and the media the first time a
player loads the game. After that first visit, the game opens and plays
without a network connection. Each new build refreshes the cache the next
time the player is online.

## Static Hosting

The build output is fully static. Upload the `dist/` folder to any static host. Most hosts need:

- **Build command**: `npm run build`
- **Publish directory**: `dist`

## Desktop Packaging

Doodle Engine games can be packaged as desktop applications with a web-to-desktop wrapper. Configure the wrapper to serve `dist/` through a small local HTTP server. Opening `index.html` directly through a `file://` address prevents the browser from loading the game's content.

**[Electron](https://www.electronjs.org/)**: runs your game in a desktop window powered by Chromium, the browser engine used by Chrome:

1. Build with `npm run build`
2. Create an Electron main process that serves `dist/` from a local HTTP server and opens a window pointed at it (Electron's `protocol.handle` or a small `http` server both work)
3. Package with `electron-builder` or `electron-forge`

**[Tauri](https://tauri.app/)**: runs your game in the operating system's built-in webview, the component used to display web content inside an application:

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
