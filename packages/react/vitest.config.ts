import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
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
