import Editor, { type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { setDlgCompletionContext, setupMonaco } from '../lib/monaco-setup';
import type { DlgCompletionContext } from '../lib/dlg-language';
import { useThemeName } from '../lib/useThemeName';

setupMonaco();

const SUGGEST_PREFERRED_HEIGHT = 260;
const SUGGEST_MIN_SPACE_ABOVE = 150;

interface SuggestDirectionController {
    dispose(): void;
    forceRenderingAbove(): void;
    stopForceRenderingAbove(): void;
}

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
    completionContext,
    onChange,
    onSave,
}: {
    value: string;
    language: string;
    markers?: EditorMarker[];
    revealLine?: number;
    revealSeq?: number;
    completionContext?: DlgCompletionContext;
    onChange: (value: string) => void;
    onSave: () => void;
}) {
    const theme = useThemeName();
    // Keep the command pointed at the latest save handler, not the one from mount.
    const saveRef = useRef(onSave);
    saveRef.current = onSave;

    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
    const editorDisposablesRef = useRef<Array<{ dispose(): void }>>([]);
    const completionContextRef = useRef(completionContext);
    completionContextRef.current = completionContext;

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

    useEffect(
        () => () => {
            for (const disposable of editorDisposablesRef.current) {
                disposable.dispose();
            }
            editorDisposablesRef.current = [];
        },
        []
    );

    useEffect(() => {
        const model = editorRef.current?.getModel();
        if (!model) return;
        setDlgCompletionContext(model, completionContext);
        return () => setDlgCompletionContext(model, undefined);
    }, [completionContext]);

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
        const model = editor.getModel();
        if (model) {
            setDlgCompletionContext(model, completionContextRef.current);
        }
        editor.addCommand(
            monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyS,
            () => saveRef.current()
        );

        const updateSuggestDirection = () => {
            const position = editor.getPosition();
            if (!position) return;
            const cursor = editor.getScrolledVisiblePosition(position);
            if (!cursor) return;

            const editorHeight = editor.getLayoutInfo().height;
            const spaceAbove = cursor.top;
            const spaceBelow = Math.max(
                0,
                editorHeight - cursor.top - cursor.height
            );
            const preferredHeight = Math.min(
                SUGGEST_PREFERRED_HEIGHT,
                editorHeight * 0.45
            );
            const controller =
                editor.getContribution<SuggestDirectionController>(
                    'editor.contrib.suggestController'
                );
            if (!controller) return;

            if (
                spaceBelow < preferredHeight &&
                spaceAbove >= SUGGEST_MIN_SPACE_ABOVE &&
                spaceAbove > spaceBelow
            ) {
                controller.forceRenderingAbove();
            } else {
                controller.stopForceRenderingAbove();
            }
        };
        editorDisposablesRef.current = [
            editor.onDidChangeCursorPosition(updateSuggestDirection),
            editor.onDidScrollChange(updateSuggestDirection),
            editor.onDidLayoutChange(updateSuggestDirection),
        ];
        updateSuggestDirection();

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
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                    verticalSliderSize: 10,
                    horizontalSliderSize: 10,
                    useShadows: false,
                },
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false,
                },
                quickSuggestionsDelay: 50,
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: 'off',
            }}
        />
    );
}
