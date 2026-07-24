// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../../shared/project';

vi.mock('../MonacoEditor', () => ({
    MonacoEditor: ({
        value,
        onChange,
        onSave,
        markers,
        revealLine,
        revealSeq,
    }: {
        value: string;
        onChange: (value: string) => void;
        onSave: () => void;
        markers: unknown[];
        revealLine?: number;
        revealSeq?: number;
    }) => (
        <>
            <textarea
                aria-label="Source editor"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                        event.preventDefault();
                        onSave();
                    }
                }}
            />
            <output data-testid="editor-state">
                {JSON.stringify({ markers, revealLine, revealSeq })}
            </output>
        </>
    ),
}));
vi.mock('../../lib/monaco-setup', () => ({
    languageForPath: () => 'yaml',
}));

import { SourceView } from '../SourceView';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test',
    version: '1.0.0',
    registry: {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    },
    config: {
        startLocation: '',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    },
    files: {},
    problems: [],
    engine: {
        declared: 'workspace:*',
        installed: '0.1.3',
        depsInstalled: true,
        packageManager: 'yarn',
    },
};

function installBridge({
    content = 'name: Original\n',
    recovery = null as string | null,
    readError = null as Error | null,
} = {}) {
    let fileChanged: ((path: string) => void) | undefined;
    const readDocument = vi.fn(async () => {
        if (readError) throw readError;
        return { content, mtimeMs: 10 };
    });
    const writeDocument = vi.fn<StudioApi['writeDocument']>(async () => ({
        ok: true,
        conflict: false,
        mtimeMs: 11,
    }));
    const saveRecovery = vi.fn(async () => {});
    const clearRecovery = vi.fn(async () => {});

    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument,
            writeDocument,
            readRecovery: vi.fn(async () => recovery),
            saveRecovery,
            clearRecovery,
            onFileChanged: vi.fn((callback: (path: string) => void) => {
                fileChanged = callback;
                return () => {};
            }),
        },
    });

    return {
        readDocument,
        writeDocument,
        saveRecovery,
        clearRecovery,
        fileChanged: () => fileChanged,
    };
}

function renderSource({
    sourceProject = project,
    path = 'content/locations/town.yaml',
    stale = false,
    revealMessage,
    revealSeq,
    onDirty = vi.fn(),
    onModified = vi.fn(),
}: {
    sourceProject?: OpenProject;
    path?: string;
    stale?: boolean;
    revealMessage?: string;
    revealSeq?: number;
    onDirty?: (tabKey: string, dirty: boolean) => void;
    onModified?: (filePath: string) => void;
} = {}) {
    return render(
        <SourceView
            project={sourceProject}
            tabKey="locations:town"
            path={path}
            stale={stale}
            revealMessage={revealMessage}
            revealSeq={revealSeq}
            onDirty={onDirty}
            onModified={onModified}
        />
    );
}

afterEach(cleanup);

describe('SourceView author journeys', () => {
    it('flushes a source edit on navigation and clears its recovery buffer', async () => {
        const bridge = installBridge();
        const user = userEvent.setup();
        const view = renderSource();

        const editor = await screen.findByLabelText('Source editor');
        await user.clear(editor);
        await user.type(editor, 'name: Changed');
        view.unmount();

        await waitFor(() =>
            expect(bridge.writeDocument).toHaveBeenCalledOnce()
        );
        expect(bridge.writeDocument).toHaveBeenCalledWith(
            project.projectDir,
            'content/locations/town.yaml',
            'name: Changed',
            10
        );
        await waitFor(() =>
            expect(bridge.clearRecovery).toHaveBeenCalledOnce()
        );
    });

    it('restores a recovery buffer and saves it as the current source', async () => {
        const bridge = installBridge({ recovery: 'name: Recovered\n' });
        const user = userEvent.setup();
        renderSource();

        expect(
            await screen.findByText(/Unsaved changes were recovered/i)
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Restore' }));
        expect(
            (screen.getByLabelText('Source editor') as HTMLTextAreaElement)
                .value
        ).toBe('name: Recovered\n');
        await user.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() =>
            expect(bridge.writeDocument).toHaveBeenCalledOnce()
        );
        expect(bridge.writeDocument.mock.calls[0][2]).toBe('name: Recovered\n');
    });

    it('discards a recovery buffer without changing the source', async () => {
        const bridge = installBridge({ recovery: 'name: Recovered\n' });
        const user = userEvent.setup();
        renderSource();

        await user.click(
            await screen.findByRole('button', { name: 'Discard' })
        );
        expect(bridge.clearRecovery).toHaveBeenCalledWith(
            project.projectDir,
            'content/locations/town.yaml'
        );
        expect(
            (screen.getByLabelText('Source editor') as HTMLTextAreaElement)
                .value
        ).toBe('name: Original\n');
        expect(
            screen.queryByText(/Unsaved changes were recovered/i)
        ).toBeNull();
    });

    it('keeps an unsaved edit when the file changes externally until the author reloads', async () => {
        const bridge = installBridge();
        const user = userEvent.setup();
        renderSource();

        const editor = await screen.findByLabelText('Source editor');
        await user.clear(editor);
        await user.type(editor, 'name: Mine');
        bridge.readDocument.mockResolvedValueOnce({
            content: 'name: External\n',
            mtimeMs: 12,
        });
        bridge.fileChanged()?.('content/locations/town.yaml');

        expect(
            await screen.findByText(/changed on disk since you opened it/i)
        ).toBeTruthy();
        expect((editor as HTMLTextAreaElement).value).toBe('name: Mine');

        await user.click(screen.getByRole('button', { name: 'Reload' }));
        expect((editor as HTMLTextAreaElement).value).toBe('name: External\n');
        expect(bridge.writeDocument).not.toHaveBeenCalled();
    });

    it('reloads a clean file changed outside Studio and ignores unrelated notifications', async () => {
        const bridge = installBridge();
        const onModified = vi.fn();
        renderSource({ onModified });
        const editor = await screen.findByLabelText('Source editor');

        bridge.fileChanged()?.('content/characters/bartender.yaml');
        expect(bridge.readDocument).toHaveBeenCalledOnce();

        bridge.readDocument.mockResolvedValueOnce({
            content: 'name: External\n',
            mtimeMs: 12,
        });
        bridge.fileChanged()?.('content\\locations\\town.yaml');

        await waitFor(() =>
            expect((editor as HTMLTextAreaElement).value).toBe(
                'name: External\n'
            )
        );
        expect(onModified).toHaveBeenCalledWith('content/locations/town.yaml');
    });

    it('offers overwrite after a save conflict and forces the chosen source to disk', async () => {
        const bridge = installBridge();
        bridge.writeDocument.mockResolvedValueOnce({
            ok: false,
            conflict: true,
            content: 'name: External\n',
            mtimeMs: 12,
        });
        const user = userEvent.setup();
        renderSource();

        const editor = await screen.findByLabelText('Source editor');
        await user.clear(editor);
        await user.type(editor, 'name: Mine');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        await user.click(
            await screen.findByRole('button', { name: 'Overwrite' })
        );

        await waitFor(() =>
            expect(bridge.writeDocument).toHaveBeenCalledTimes(2)
        );
        expect(bridge.writeDocument.mock.calls[1]).toEqual([
            project.projectDir,
            'content/locations/town.yaml',
            'name: Mine',
            undefined,
        ]);
    });

    it('recreates a source file deleted before save', async () => {
        const bridge = installBridge();
        bridge.writeDocument.mockResolvedValueOnce({
            ok: false,
            conflict: true,
            missing: true,
            mtimeMs: 0,
        });
        const user = userEvent.setup();
        renderSource();

        const editor = await screen.findByLabelText('Source editor');
        await user.clear(editor);
        await user.type(editor, 'name: Recreated');
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(await screen.findByText(/deleted outside Studio/i)).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Recreate it' }));

        await waitFor(() =>
            expect(bridge.writeDocument).toHaveBeenCalledTimes(2)
        );
        expect(bridge.writeDocument.mock.calls[1][3]).toBeUndefined();
    });

    it('places dialogue diagnostics and reveal requests on their source lines', async () => {
        const dialogue = `# note
NODE start
  NARRATOR: Hello.
  GOTO second

NODE second
  HURRDURR value
  END dialogue
`;
        installBridge({ content: dialogue });
        renderSource({
            sourceProject: {
                ...project,
                problems: [
                    {
                        file: 'content/dialogues/test.dlg',
                        message: 'Node "second" has a problem',
                    },
                    {
                        file: 'content/dialogues/test.dlg',
                        message: 'Unknown effect keyword: HURRDURR',
                    },
                    {
                        file: 'content/dialogues/test.dlg',
                        message:
                            'Localization key "value" not found in any locale file',
                    },
                    {
                        file: 'content/dialogues/test.dlg',
                        message: 'Nothing here says where this lives',
                    },
                ],
            },
            path: 'content/dialogues/test.dlg',
            revealMessage: 'line 7: Unknown effect keyword: HURRDURR',
            revealSeq: 3,
        });

        const state = JSON.parse(
            (await screen.findByTestId('editor-state')).textContent ?? '{}'
        );
        expect(state).toEqual({
            markers: [
                { line: 6, message: 'Node "second" has a problem' },
                { line: 7, message: 'Unknown effect keyword: HURRDURR' },
                {
                    line: 7,
                    message:
                        'Localization key "value" not found in any locale file',
                },
            ],
            revealLine: 7,
            revealSeq: 3,
        });
    });

    it('reports document read failures', async () => {
        installBridge({ readError: new Error('permission denied') });
        renderSource();
        expect(await screen.findByText('permission denied')).toBeTruthy();
    });
});
