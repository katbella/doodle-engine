import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'node',
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
            exclude: ['src/**/__tests__/**'],
            thresholds: {
                statements: 90,
                branches: 78,
                functions: 87,
                lines: 91,
            },
        },
    },
});
