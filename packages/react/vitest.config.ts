import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@doodle-engine/core': fileURLToPath(
                new URL('../core/src/index.ts', import.meta.url)
            ),
        },
    },
    test: {
        environment: 'node',
        setupFiles: ['./src/__tests__/setup.ts'],
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'integration',
                    include: ['src/**/*.test.tsx'],
                    exclude: ['src/**/*.journey.test.tsx'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'journey',
                    include: ['src/**/*.journey.test.tsx'],
                },
            },
        ],
        coverage: {
            provider: 'v8',
            reportsDirectory: './coverage',
            reporter: ['text', 'json-summary', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/__tests__/**'],
            thresholds: {
                statements: 88,
                branches: 80,
                functions: 87,
                lines: 90,
            },
        },
    },
});
