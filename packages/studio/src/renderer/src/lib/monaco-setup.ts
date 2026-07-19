import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

let ready = false;

/**
 * Configure Monaco once: use locally bundled workers (never a CDN, so the app
 * works offline), point @monaco-editor/react at this bundled instance, and
 * register the .dlg and YAML languages plus themes that match the app.
 */
export function setupMonaco(): void {
    if (ready) return;
    ready = true;

    (
        self as unknown as { MonacoEnvironment: monaco.Environment }
    ).MonacoEnvironment = {
        getWorker: () => new editorWorker(),
    };

    loader.config({ monaco });

    registerDlg();
    registerYaml();
    defineThemes();
}

/** Highlighting for the dialogue DSL. */
function registerDlg(): void {
    monaco.languages.register({ id: 'doodle-dlg' });
    monaco.languages.setLanguageConfiguration('doodle-dlg', {
        comments: { lineComment: '#' },
    });
    monaco.languages.setMonarchTokensProvider('doodle-dlg', {
        keywords: [
            'NODE', 'CHOICE', 'IF', 'END', 'GOTO', 'TRIGGER', 'REQUIRE',
            'VOICE', 'PORTRAIT', 'NARRATOR', 'SET', 'CLEAR', 'ADD', 'REMOVE',
            'MOVE', 'ADVANCE', 'START', 'MUSIC', 'SOUND', 'VIDEO', 'INTERLUDE',
            'NOTIFY', 'ROLL',
        ],
        tokenizer: {
            root: [
                [/#.*$/, 'comment'],
                [/@[\w.]+/, 'type'],
                [/"[^"]*"/, 'string'],
                [
                    /[A-Z_]+/,
                    { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
                ],
                [/-?\d+/, 'number'],
                [/:/, 'delimiter'],
            ],
        },
    });
}

/** Minimal YAML highlighting (Monaco core has no YAML language). */
function registerYaml(): void {
    monaco.languages.register({ id: 'yaml' });
    monaco.languages.setLanguageConfiguration('yaml', {
        comments: { lineComment: '#' },
    });
    monaco.languages.setMonarchTokensProvider('yaml', {
        tokenizer: {
            root: [
                [/#.*$/, 'comment'],
                [/@[\w.]+/, 'type'],
                [/^\s*-\s/, 'delimiter'],
                [/[\w.-]+(?=\s*:)/, 'key'],
                [/"[^"]*"|'[^']*'/, 'string'],
                [/\b(true|false|null)\b/, 'keyword'],
                [/-?\d+(\.\d+)?/, 'number'],
            ],
        },
    });
}

function defineThemes(): void {
    const rules = [
        { token: 'comment', foreground: '6b6b6b', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff9783' },
        { token: 'type', foreground: 'd9a441' },
        { token: 'key', foreground: 'ff9783' },
        { token: 'string', foreground: 'c8d6a0' },
        { token: 'number', foreground: '9fb8d6' },
    ];
    const darkBackgrounds: Array<[string, string]> = [
        ['doodle-dark', '#101113'],
        ['doodle-forest', '#0f1a10'],
        ['doodle-space', '#0e1019'],
        ['doodle-neon', '#0e0718'],
        ['doodle-deep-sea', '#061518'],
        ['doodle-storm', '#101623'],
        ['doodle-royal-velvet', '#19080c'],
        ['doodle-pumpkin', '#161514'],
        ['doodle-blueprint', '#102540'],
        ['doodle-sepia-noir', '#191510'],
        ['doodle-firelight', '#1c110a'],
        ['doodle-high-contrast', '#000000'],
    ];
    for (const [name, background] of darkBackgrounds) {
        monaco.editor.defineTheme(name, {
            base: 'vs-dark',
            inherit: true,
            rules,
            colors: { 'editor.background': background },
        });
    }
    monaco.editor.defineTheme('doodle-terminal', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '3e6b4d', fontStyle: 'italic' },
            { token: 'keyword', foreground: '66ff99' },
            { token: 'type', foreground: 'ffd75e' },
            { token: 'key', foreground: '66ff99' },
            { token: 'string', foreground: 'b3f0c2' },
            { token: 'number', foreground: '8ff0b0' },
        ],
        colors: { 'editor.background': '#041008' },
    });
    const lightRules = [
        { token: 'comment', foreground: '8a8a8a', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c0392b' },
        { token: 'type', foreground: '9a6b1a' },
        { token: 'key', foreground: 'c0392b' },
        { token: 'string', foreground: '4c7a1f' },
        { token: 'number', foreground: '2c5aa0' },
    ];
    const lightBackgrounds: Array<[string, string]> = [
        ['doodle-light', '#ffffff'],
        ['doodle-parchment', '#f7f0e3'],
        ['doodle-sakura', '#fdf6f8'],
        ['doodle-glacier', '#f5f9fc'],
    ];
    for (const [name, background] of lightBackgrounds) {
        monaco.editor.defineTheme(name, {
            base: 'vs',
            inherit: true,
            rules: lightRules,
            colors: { 'editor.background': background },
        });
    }
}

/** The Monaco language id for a file path. */
export function languageForPath(path: string): string {
    if (path.endsWith('.dlg')) return 'doodle-dlg';
    if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    return 'plaintext';
}
