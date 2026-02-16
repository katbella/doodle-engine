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

Since the build output is fully static, you can deploy to any static hosting provider:

### Netlify

Drag and drop your `dist/` folder, or connect your repo:
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### Vercel

Import your repo and configure:
- **Framework Preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`

### GitHub Pages

Push the contents of `dist/` to a `gh-pages` branch, or use GitHub Actions to automate deployment.

### itch.io

Zip the contents of `dist/` and upload as an HTML5 game project. Set the viewport dimensions in your itch.io project settings.

## Asset Hosting Considerations

For small games, bundle everything in `dist/`. For larger games with significant media files:

- **Images**: Keep in `assets/images/`. They'll be copied to the build output
- **Audio**: Keep in `assets/audio/`. Music and voice files can be large
- **Video**: Keep in `assets/video/`. Cutscenes are the largest files

### CDN for Large Media

If your game has many audio or video files, consider hosting media on a CDN and configuring base paths:

```tsx
<GameShell
  audioOptions={{ audioBasePath: 'https://cdn.example.com/audio' }}
  videoBasePath="https://cdn.example.com/video"
/>
```

## Desktop Packaging

Doodle Engine games are web apps, so they can be packaged as desktop applications using standard web-to-desktop wrappers. No special engine configuration is needed.

### Electron

[Electron](https://www.electronjs.org/) wraps your web app in a Chromium browser window:

1. Build your game with `npm run build`
2. Create an Electron main process that loads `dist/index.html`
3. Package with `electron-builder` or `electron-forge`

See the [Electron documentation](https://www.electronjs.org/docs) for setup guides.

### Tauri

[Tauri](https://tauri.app/) is a lighter alternative using the system webview:

1. Build your game with `npm run build`
2. Point Tauri's `devPath` at your `dist/` directory
3. Build with `tauri build`

See the [Tauri documentation](https://tauri.app/guides/) for setup guides.

Both options work with Doodle Engine out of the box. The game runs entirely in the browser, so no native APIs are required.
