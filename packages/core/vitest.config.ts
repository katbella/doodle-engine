import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(
    readFileSync(resolve(__dirname, 'package.json'), 'utf8')
);

export default defineConfig({
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
                statements: 90,
                branches: 83,
                functions: 96,
                lines: 90,
            },
        },
    },
});
