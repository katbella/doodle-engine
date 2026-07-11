import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

let ready = false;

/**
 * Configure Monaco once: use locally bundled workers (never a CDN, so the app
 * works offline), point @monaco-editor/react at this bundled instance, and
 * register the .dlg and YAML languages plus themes that match the app.
 */
export function setupMonaco(): void {
    if (ready) return;
    ready = true;

    (self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment =
        {
            getWorker(_id, label) {
                if (label === 'json') return new jsonWorker();
                if (label === 'css' || label === 'scss' || label === 'less') {
                    return new cssWorker();
                }
                if (label === 'typescript' || label === 'javascript') {
                    return new tsWorker();
                }
                return new editorWorker();
            },
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
    monaco.editor.defineTheme('doodle-dark', {
        base: 'vs-dark',
        inherit: true,
        rules,
        colors: { 'editor.background': '#101113' },
    });
    monaco.editor.defineTheme('doodle-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '8a8a8a', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'c0392b' },
            { token: 'type', foreground: '9a6b1a' },
            { token: 'key', foreground: 'c0392b' },
            { token: 'string', foreground: '4c7a1f' },
            { token: 'number', foreground: '2c5aa0' },
        ],
        colors: { 'editor.background': '#ffffff' },
    });
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
