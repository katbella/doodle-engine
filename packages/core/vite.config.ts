import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The exported VERSION constant comes from package.json, so releases only
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
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es', 'cjs'],
            fileName: 'core',
        },
    },
});
