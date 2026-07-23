// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const harness = vi.hoisted(() => ({ props: null as any }));

const monacoSetup = vi.hoisted(() => ({
    setupMonaco: vi.fn(),
    setDlgCompletionContext: vi.fn(),
}));

vi.mock('../../lib/monaco-setup', () => monacoSetup);

vi.mock('@monaco-editor/react', async () => {
    const React = await import('react');
    return {
        default: (props: any) => {
            harness.props = props;
            React.useEffect(() => {
                props.onMount(
                    (globalThis as any).__editor,
                    (globalThis as any).__monaco
                );
            }, []);
            return (
                <button onClick={() => props.onChange(undefined)}>
                    editor:{props.theme}
                </button>
            );
        },
    };
});

import { MonacoEditor } from '../MonacoEditor';

afterEach(cleanup);

describe('MonacoEditor', () => {
    it('mounts commands, clamps markers, reveals lines, changes text, and follows theme', async () => {
        const command = vi.fn();
        const forceRenderingAbove = vi.fn();
        const stopForceRenderingAbove = vi.fn();
        let cursorTop = 260;
        let cursorListener = () => {};
        const model = {
            getLineCount: () => 3,
            getLineMaxColumn: (line: number) => line + 4,
        };
        const editor = {
            getModel: () => model,
            addCommand: vi.fn((_key: number, callback: () => void) =>
                command.mockImplementation(callback)
            ),
            revealLineInCenter: vi.fn(),
            setPosition: vi.fn(),
            focus: vi.fn(),
            getPosition: () => ({ lineNumber: 2, column: 1 }),
            getScrolledVisiblePosition: () => ({
                top: cursorTop,
                left: 0,
                height: 18,
            }),
            getLayoutInfo: () => ({ height: 300 }),
            getContribution: () => ({
                dispose: vi.fn(),
                forceRenderingAbove,
                stopForceRenderingAbove,
            }),
            onDidChangeCursorPosition: vi.fn((listener: () => void) => {
                cursorListener = listener;
                return { dispose: vi.fn() };
            }),
            onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
            onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
        };
        const monaco = {
            MarkerSeverity: { Error: 8 },
            KeyMod: { CtrlCmd: 1 },
            KeyCode: { KeyS: 2 },
            editor: { setModelMarkers: vi.fn() },
        };
        (globalThis as any).__editor = editor;
        (globalThis as any).__monaco = monaco;
        document.documentElement.setAttribute('data-theme', 'dark');
        const onChange = vi.fn();
        const firstSave = vi.fn();
        const secondSave = vi.fn();
        const user = userEvent.setup();
        const { rerender } = render(
            <MonacoEditor
                value="one\ntwo\nthree"
                language="yaml"
                markers={[
                    { line: 0, message: 'too low' },
                    { line: 20, message: 'too high' },
                ]}
                revealLine={2}
                revealSeq={1}
                onChange={onChange}
                onSave={firstSave}
            />
        );

        await waitFor(() => expect(editor.addCommand).toHaveBeenCalledOnce());
        expect(monaco.editor.setModelMarkers).toHaveBeenCalledWith(
            model,
            'doodle',
            [
                expect.objectContaining({ startLineNumber: 1, endColumn: 5 }),
                expect.objectContaining({ startLineNumber: 3, endColumn: 7 }),
            ]
        );
        expect(editor.revealLineInCenter).toHaveBeenCalledWith(2);
        expect(editor.setPosition).toHaveBeenCalledWith({
            lineNumber: 2,
            column: 1,
        });
        expect(forceRenderingAbove).toHaveBeenCalledOnce();
        cursorTop = 20;
        cursorListener();
        expect(stopForceRenderingAbove).toHaveBeenCalledOnce();

        rerender(
            <MonacoEditor
                value="changed"
                language="yaml"
                markers={[]}
                revealLine={0}
                revealSeq={2}
                onChange={onChange}
                onSave={secondSave}
            />
        );
        command();
        expect(firstSave).not.toHaveBeenCalled();
        expect(secondSave).toHaveBeenCalledOnce();
        await user.click(screen.getByRole('button', { name: /editor:/ }));
        expect(onChange).toHaveBeenCalledWith('');

        document.documentElement.setAttribute('data-theme', 'light');
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'editor:doodle-light' })
            ).toBeTruthy()
        );
        expect(harness.props.options.minimap.enabled).toBe(false);
        expect(harness.props.options.scrollbar).toEqual({
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            verticalSliderSize: 10,
            horizontalSliderSize: 10,
            useShadows: false,
        });
        expect(harness.props.options.quickSuggestions).toEqual({
            other: true,
            comments: false,
            strings: false,
        });
        expect(harness.props.options.suggestOnTriggerCharacters).toBe(true);
        expect(harness.props.options.wordBasedSuggestions).toBe('off');
        expect(harness.props.options.suggest).toBeUndefined();
        expect(monacoSetup.setDlgCompletionContext).toHaveBeenCalledWith(
            model,
            undefined
        );
    });

    it('does nothing when the editor has no model', async () => {
        (globalThis as any).__editor = {
            getModel: () => null,
            addCommand: vi.fn(),
            getPosition: () => null,
            onDidChangeCursorPosition: vi.fn(() => ({ dispose: vi.fn() })),
            onDidScrollChange: vi.fn(() => ({ dispose: vi.fn() })),
            onDidLayoutChange: vi.fn(() => ({ dispose: vi.fn() })),
        };
        (globalThis as any).__monaco = {
            MarkerSeverity: { Error: 8 },
            KeyMod: { CtrlCmd: 1 },
            KeyCode: { KeyS: 2 },
            editor: { setModelMarkers: vi.fn() },
        };
        render(
            <MonacoEditor
                value=""
                language="plaintext"
                onChange={vi.fn()}
                onSave={vi.fn()}
            />
        );
        await waitFor(() =>
            expect(
                (globalThis as any).__editor.addCommand
            ).toHaveBeenCalledOnce()
        );
        expect(
            (globalThis as any).__monaco.editor.setModelMarkers
        ).not.toHaveBeenCalled();
    });
});
