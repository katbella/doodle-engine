import { resolve } from 'path';
import { readFileSync } from 'fs';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
);

/**
 * Electron build config for Doodle Studio.
 *
 * Three separate builds: the Node main process, the preload bridge, and the
 * Chromium renderer (React). Everything the app needs at runtime (core, toolkit,
 * chokidar, yaml) is a devDependency, so electron-vite bundles it into out/ —
 * the packaged app ships no node_modules. Vite and the React plugin are loaded
 * from the opened project instead (see project-modules in the toolkit).
 *
 * The main build has extra entries for the build and preview utility processes.
 * A build or dev server runs the project's own untrusted Vite config, so it runs
 * in a separate Node process rather than in the main process; each worker is its
 * own entry that main forks at runtime.
 */
export default defineConfig({
    main: {
        define: {
            __DOODLE_VERSION__: JSON.stringify(pkg.version),
        },
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
    preload: {},
    renderer: {
        resolve: {
            alias: {
                '@': resolve('src/renderer/src'),
            },
        },
        plugins: [react()],
    },
});
