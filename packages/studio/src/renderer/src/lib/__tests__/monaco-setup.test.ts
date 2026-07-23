import { beforeAll, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    loaderConfig: vi.fn(),
    register: vi.fn(),
    languageConfig: vi.fn(),
    tokens: vi.fn(),
    monarchTokens: vi.fn(),
    completion: vi.fn(),
    hover: vi.fn(),
    theme: vi.fn(),
}));

vi.hoisted(() => {
    Object.assign(globalThis, { self: globalThis });
});

vi.mock('@monaco-editor/react', () => ({
    loader: { config: mocks.loaderConfig },
}));

vi.mock(
    'monaco-editor/esm/vs/base/browser/ui/codicons/codiconStyles.js',
    () => ({})
);

vi.mock(
    'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js',
    () => ({})
);

vi.mock(
    'monaco-editor/esm/vs/editor/contrib/hover/browser/hoverContribution.js',
    () => ({})
);

vi.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
    languages: {
        register: mocks.register,
        setLanguageConfiguration: mocks.languageConfig,
        setTokensProvider: mocks.tokens,
        setMonarchTokensProvider: mocks.monarchTokens,
        registerCompletionItemProvider: mocks.completion,
        registerHoverProvider: mocks.hover,
        CompletionItemKind: { Keyword: 1, Reference: 2, Value: 3 },
    },
    editor: { defineTheme: mocks.theme },
}));

vi.mock('monaco-editor/esm/vs/editor/editor.worker?worker', () => ({
    default: class EditorWorker {},
}));

import { languageForPath, setupMonaco } from '../monaco-setup';
import {
    dlgCompletions,
    dlgHover,
    getDlgCursorContext,
    tokenizeDlgLine,
    type DlgCompletionContext,
} from '../dlg-language';

beforeAll(() => setupMonaco());

describe('Monaco setup', () => {
    it('registers local languages, themes, loader, and worker exactly once', () => {
        setupMonaco();
        expect(mocks.loaderConfig).toHaveBeenCalledOnce();
        expect(mocks.register).toHaveBeenCalledWith({ id: 'doodle-dlg' });
        expect(mocks.register).toHaveBeenCalledWith({ id: 'yaml' });
        expect(mocks.languageConfig).toHaveBeenCalledTimes(2);
        expect(mocks.tokens).toHaveBeenCalledOnce();
        expect(mocks.monarchTokens).toHaveBeenCalledOnce();
        expect(mocks.completion).toHaveBeenCalledWith(
            'doodle-dlg',
            expect.objectContaining({
                triggerCharacters: [' '],
                provideCompletionItems: expect.any(Function),
            })
        );
        expect(mocks.hover).toHaveBeenCalledWith(
            'doodle-dlg',
            expect.objectContaining({
                provideHover: expect.any(Function),
            })
        );
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

    it('returns suggestions through the registered Monaco provider', () => {
        const provider = mocks.completion.mock.calls[0][1] as {
            provideCompletionItems: (
                model: { getLineContent: (line: number) => string },
                position: { lineNumber: number; column: number }
            ) => {
                suggestions: Array<{
                    label: { label: string; description: string };
                }>;
            };
        };
        const result = provider.provideCompletionItems(
            { getLineContent: () => 'REQUIRE ' },
            { lineNumber: 1, column: 9 }
        );
        expect(result.suggestions.map((item) => item.label.label)).toContain(
            'questAtStage'
        );
        expect(
            result.suggestions.find(
                (item) => item.label.label === 'questAtStage'
            )?.label.description
        ).toBe('Quest at stage · Quests');
    });

    it('shows longer command help only when the user hovers', () => {
        expect(dlgHover('NODE quest_complete', 2)).toEqual({
            documentation: expect.stringContaining('`NODE <nodeId>`'),
            startColumn: 1,
            endColumn: 5,
        });
        expect(
            dlgHover('REQUIRE questAtStage odd_jobs complete', 12)
                ?.documentation
        ).toContain('`REQUIRE questAtStage <questId> <stageId>`');
        expect(dlgHover('NARRATOR: Hello', 4)?.documentation).toContain(
            'Write narration'
        );
        expect(dlgHover('NARRATOR: Hello', 14)).toBeNull();
    });

    it('finds descriptor arguments at the cursor', () => {
        const line = 'REQUIRE questAtStage odd_jobs started';
        expect(getDlgCursorContext(line, 32)).toEqual({
            keyword: 'questAtStage',
            argumentIndex: 1,
            argumentKind: 'stageId',
            argumentValues: ['odd_jobs', 'started'],
        });
        expect(
            getDlgCursorContext('  SET characterStat elena courage 4', 29)
        ).toMatchObject({
            keyword: 'SET characterStat',
            argumentIndex: 1,
            argumentKind: 'stat',
        });
    });

    it('colors condition names and each descriptor argument as whole tokens', () => {
        const line = 'REQUIRE questAtStage odd_jobs started';
        const tokens = tokenizeDlgLine(line);
        expect(
            tokens
                .filter((token) => line[token.startIndex] !== ' ')
                .map((token) => [
                    line.slice(token.startIndex).split(/\s/, 1)[0],
                    token.scopes,
                ])
        ).toEqual([
            ['REQUIRE', 'keyword'],
            ['questAtStage', 'condition'],
            ['odd_jobs', 'reference'],
            ['started', 'literal'],
        ]);
    });

    it('distinguishes an effect verb from its target', () => {
        const line = 'SET questStage odd_jobs complete';
        expect(
            tokenizeDlgLine(line)
                .filter((token) => line[token.startIndex] !== ' ')
                .map((token) => token.scopes)
        ).toEqual(['keyword', 'effectTarget', 'reference', 'literal']);
    });

    it('offers descriptor keywords and project values in valid contexts', () => {
        const context = {
            nameCatalog: {
                flags: [{ id: 'met_elena' }],
                variables: [{ id: 'gold' }],
                stats: [{ id: 'courage' }],
            },
            registry: {
                locations: { docks: { id: 'docks' } },
                characters: { elena: { id: 'elena' } },
                items: { letter: { id: 'letter' } },
                maps: {},
                dialogues: { intro: { id: 'intro' } },
                quests: {
                    odd_jobs: {
                        id: 'odd_jobs',
                        stages: [{ id: 'started' }, { id: 'complete' }],
                    },
                },
                journalEntries: {},
                interludes: {},
                locales: {},
            },
            nodeIds: ['opening', 'farewell'],
        } as unknown as DlgCompletionContext;

        expect(
            dlgCompletions('REQUIRE ', 9, context).map((item) => item.label)
        ).toContain('questAtStage');
        expect(
            dlgCompletions('REQUIRE hasFlag ', 17, context).map(
                (item) => item.label
            )
        ).toEqual(['met_elena']);
        expect(
            dlgCompletions('REQUIRE questAtStage odd_jobs ', 31, context).map(
                (item) => item.label
            )
        ).toEqual(['complete', 'started']);
        expect(
            dlgCompletions('  GOTO ', 8, context).map((item) => item.label)
        ).toEqual(['farewell', 'location', 'opening']);
        expect(
            dlgCompletions('', 1, context).map((item) => item.label)
        ).toContain('SET flag');
        expect(
            dlgCompletions('', 1, context).map((item) => item.label)
        ).toContain('REQUIRE hasFlag');
        expect(
            dlgCompletions('', 1, context).map((item) => item.label)
        ).toEqual(
            expect.arrayContaining([
                'NODE',
                'CHOICE',
                'END',
                'TRIGGER',
                'VOICE',
                'PORTRAIT',
                'NARRATOR:',
            ])
        );
        expect(
            dlgCompletions('', 1, context).find((item) => item.label === 'NODE')
                ?.documentation
        ).toContain('`NODE <nodeId>`');
        expect(
            dlgCompletions('REQUIRE ', 9, context).find(
                (item) => item.label === 'questAtStage'
            )?.documentation
        ).toContain('**Arguments**');
        expect(dlgCompletions('NARRATOR: Hello', 16, context)).toEqual([]);
        expect(dlgCompletions('# REQUIRE ', 11, context)).toEqual([]);
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
