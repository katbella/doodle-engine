import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: {
                toolkit: resolve(__dirname, 'src/index.ts'),
            },
            formats: ['es', 'cjs'],
            fileName: (format, entryName) =>
                `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            // Externalize everything that will be in node_modules at runtime.
            external: [
                // Workspace packages
                '@doodle-engine/core',
                // npm dependencies
                '@vitejs/plugin-react',
                'chokidar',
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
        },
        target: 'node24',
        outDir: 'dist',
    },
});
