import { beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    loaderConfig: vi.fn(),
    register: vi.fn(),
    languageConfig: vi.fn(),
    tokens: vi.fn(),
    theme: vi.fn(),
}));

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

vi.mock('@monaco-editor/react', () => ({
    loader: { config: mocks.loaderConfig },
}));

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
    languages: {
        register: mocks.register,
        setLanguageConfiguration: mocks.languageConfig,
        setMonarchTokensProvider: mocks.tokens,
    },
    editor: { defineTheme: mocks.theme },
}));

vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({
    default: class EditorWorker {},
}));

import { languageForPath, setupMonaco } from '../monaco-setup';

beforeAll(() => setupMonaco());

describe('Monaco setup', () => {
    it('registers local languages, themes, loader, and worker exactly once', () => {
        setupMonaco();
        expect(mocks.loaderConfig).toHaveBeenCalledOnce();
        expect(mocks.register).toHaveBeenCalledWith({ id: 'doodle-dlg' });
        expect(mocks.register).toHaveBeenCalledWith({ id: 'yaml' });
        expect(mocks.languageConfig).toHaveBeenCalledTimes(2);
        expect(mocks.tokens).toHaveBeenCalledTimes(2);
        for (const name of [
            'doodle-dark',
            'doodle-forest',
            'doodle-space',
            'doodle-neon',
            'doodle-deep-sea',
            'doodle-terminal',
            'doodle-storm',
            'doodle-royal-velvet',
            'doodle-pumpkin',
            'doodle-blueprint',
            'doodle-sepia-noir',
            'doodle-firelight',
            'doodle-high-contrast',
        ]) {
            expect(mocks.theme).toHaveBeenCalledWith(
                name,
                expect.objectContaining({ base: 'vs-dark' })
            );
        }
        for (const name of [
            'doodle-light',
            'doodle-parchment',
            'doodle-sakura',
            'doodle-glacier',
        ]) {
            expect(mocks.theme).toHaveBeenCalledWith(
                name,
                expect.objectContaining({ base: 'vs' })
            );
        }
        const worker = (
            self as unknown as {
                MonacoEnvironment: { getWorker: () => unknown };
            }
        ).MonacoEnvironment.getWorker();
        expect(worker).toBeTruthy();
    });

    it('selects a language for every supported extension', () => {
        expect(languageForPath('dialogue.dlg')).toBe('doodle-dlg');
        expect(languageForPath('entity.yaml')).toBe('yaml');
        expect(languageForPath('entity.yml')).toBe('yaml');
        expect(languageForPath('data.json')).toBe('json');
        expect(languageForPath('styles.css')).toBe('css');
        expect(languageForPath('app.ts')).toBe('typescript');
        expect(languageForPath('app.tsx')).toBe('typescript');
        expect(languageForPath('app.js')).toBe('javascript');
        expect(languageForPath('app.jsx')).toBe('javascript');
        expect(languageForPath('README')).toBe('plaintext');
    });
});
