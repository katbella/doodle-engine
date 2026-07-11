import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

/**
 * Electron build config for Doodle Studio.
 *
 * Three separate builds: the Node main process, the preload bridge, and the
 * Chromium renderer (React). externalizeDepsPlugin keeps node_modules
 * dependencies (including @doodle-engine/toolkit) external in main/preload so
 * they are required at runtime rather than bundled.
 */
export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        resolve: {
            alias: {
                '@': resolve('src/renderer/src'),
            },
        },
        plugins: [react()],
    },
});
