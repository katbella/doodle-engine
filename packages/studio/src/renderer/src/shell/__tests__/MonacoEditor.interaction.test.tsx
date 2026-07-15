// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const harness = vi.hoisted(() => ({ props: null as any }));

vi.mock('../../lib/monaco-setup', () => ({ setupMonaco: vi.fn() }));

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
    });

    it('does nothing when the editor has no model', async () => {
        (globalThis as any).__editor = {
            getModel: () => null,
            addCommand: vi.fn(),
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
