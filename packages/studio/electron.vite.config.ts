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
 *
 * The main build has extra entries for the build and preview utility processes.
 * A build or dev server runs the project's own untrusted Vite config, so it runs
 * in a separate Node process rather than in the main process; each worker is its
 * own entry that main forks at runtime.
 */
export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                input: {
                    index: resolve('src/main/index.ts'),
                    'build-worker': resolve('src/main/build-worker.ts'),
                    'preview-worker': resolve('src/main/preview-worker.ts'),
                },
            },
        },
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
