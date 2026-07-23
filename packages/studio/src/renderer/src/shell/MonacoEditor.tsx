import Editor, { type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { setupMonaco } from '../lib/monaco-setup';
import { useThemeName } from '../lib/useThemeName';

setupMonaco();

function cssToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    return value || fallback;
}

export interface EditorMarker {
    line: number;
    message: string;
}

export function MonacoEditor({
    value,
    language,
    markers,
    revealLine,
    revealSeq,
    onChange,
    onSave,
}: {
    value: string;
    language: string;
    markers?: EditorMarker[];
    revealLine?: number;
    revealSeq?: number;
    onChange: (value: string) => void;
    onSave: () => void;
}) {
    const theme = useThemeName();
    // Keep the command pointed at the latest save handler, not the one from mount.
    const saveRef = useRef(onSave);
    saveRef.current = onSave;

    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

    const applyMarkers = () => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const model = editor?.getModel();
        if (!editor || !monaco || !model) return;
        const lineCount = model.getLineCount();
        monaco.editor.setModelMarkers(
            model,
            'doodle',
            (markers ?? []).map((mark) => {
                const line = Math.min(Math.max(mark.line, 1), lineCount);
                return {
                    severity: monaco.MarkerSeverity.Error,
                    message: mark.message,
                    startLineNumber: line,
                    startColumn: 1,
                    endLineNumber: line,
                    endColumn: model.getLineMaxColumn(line),
                };
            })
        );
    };

    useEffect(applyMarkers, [markers]);

    const reveal = () => {
        const editor = editorRef.current;
        if (!editor || !revealLine || revealLine < 1) return;
        editor.revealLineInCenter(revealLine);
        editor.setPosition({ lineNumber: revealLine, column: 1 });
        editor.focus();
    };

    // Jump to a line only when a problem is clicked (revealSeq changes each
    // time); never on marker/content updates, which would steal the cursor.
    useEffect(reveal, [revealSeq]);

    const onMount: OnMount = (editor, monacoApi) => {
        editorRef.current = editor;
        monacoRef.current = monacoApi;
        editor.addCommand(
            monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyS,
            () => saveRef.current()
        );
        applyMarkers();
        reveal();
    };

    return (
        <Editor
            height="100%"
            value={value}
            language={language}
            theme={`doodle-${theme}`}
            onChange={(v) => onChange(v ?? '')}
            onMount={onMount}
            options={{
                minimap: { enabled: false },
                fontFamily: cssToken(
                    '--font-mono',
                    "ui-monospace, 'Consolas', monospace"
                ),
                fontSize:
                    Number.parseFloat(cssToken('--text-base', '13')) || 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                renderWhitespace: 'selection',
                wordWrap: 'off',
            }}
        />
    );
}
