import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8')
);

export default defineConfig({
    resolve: {
        alias: {
            '@doodle-engine/core': resolve(__dirname, '../core/src/index.ts'),
            '@doodle-engine/toolkit': resolve(
                __dirname,
                '../toolkit/src/index.ts'
            ),
        },
    },
    define: {
        __DOODLE_VERSION__: JSON.stringify(pkg.version),
    },
    test: {
        coverage: {
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: ['text', 'json-summary', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/__tests__/**'],
            thresholds: {
                statements: 98,
                branches: 85,
                functions: 98,
                lines: 98,
            },
        },
    },
});
