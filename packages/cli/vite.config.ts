import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// `doodle --version` reports the version from package.json, so releases only
// ever bump the version in one place.
const pkg = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig({
    define: {
        __DOODLE_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        lib: {
            entry: {
                cli: resolve(__dirname, 'src/cli.ts'),
            },
            formats: ['es'],
            fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
            // Externalize everything that will be in node_modules at runtime
            external: [
                // Workspace packages
                '@doodle-engine/core',
                '@doodle-engine/react',
                '@doodle-engine/toolkit',
                // npm dependencies
                '@vitejs/plugin-react',
                'chokidar',
                'commander',
                'crayon.js',
                'prompts',
                'vite',
                'yaml',
                // Node.js built-ins
                /^node:/,
                'path',
                'fs',
                'fs/promises',
                'url',
                'module',
                'util',
                'stream',
                'events',
                'buffer',
                'crypto',
                'os',
                'child_process',
                'http',
                'https',
                'net',
                'tls',
                'zlib',
                'querystring',
                'assert',
                'readline',
                'tty',
                'worker_threads',
                'perf_hooks',
                'inspector',
                'dns',
                'dgram',
                'fsevents',
            ],
            output: {
                banner: '#!/usr/bin/env node',
            },
        },
        target: 'node24',
        outDir: 'dist',
    },
});
