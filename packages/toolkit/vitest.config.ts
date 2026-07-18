import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@doodle-engine/core': fileURLToPath(
                new URL('../core/src/index.ts', import.meta.url)
            ),
        },
    },
    test: {
        coverage: {
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: ['text', 'json-summary', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/__tests__/**', 'src/templates/**'],
            thresholds: {
                statements: 90,
                branches: 75,
                functions: 94,
                lines: 90,
            },
        },
    },
});
