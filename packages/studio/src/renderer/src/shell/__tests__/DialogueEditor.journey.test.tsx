// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../../shared/project';
import { DialogueEditor } from '../DialogueEditor';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test',
    version: '1.0.0',
    registry: {
        locations: {},
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Bartender',
                biography: '',
                portrait: '',
                location: '',
                dialogue: 'greeting',
                stats: {},
            },
        },
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
    files: { 'dialogues:greeting': 'content/dialogues/greeting.dlg' },
    problems: [],
    engine: {
        declared: 'workspace:*',
        installed: '0.1.3',
        depsInstalled: true,
        packageManager: 'yarn',
    },
};

const source = `# Author comment must survive
NODE start
  BARTENDER: Welcome.
  CHOICE Ask a question
    GOTO second
  END

NODE second
  NARRATOR: Goodbye.
  END dialogue
`;

function installBridge(content = source, readError: Error | null = null) {
    const writeDocument = vi.fn<StudioApi['writeDocument']>(async () => ({
        ok: true,
        conflict: false,
        mtimeMs: 11,
    }));
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument: vi.fn(async () => {
                if (readError) throw readError;
                return { content, mtimeMs: 10 };
            }),
            writeDocument,
        },
    });
    return writeDocument;
}

function renderEditor() {
    return render(
        <DialogueEditor
            project={project}
            tabKey="dialogues:greeting"
            path="content/dialogues/greeting.dlg"
            dialogueId="greeting"
            onDirty={() => {}}
            onModified={() => {}}
        />
    );
}

afterEach(cleanup);

describe('DialogueEditor author journeys', () => {
    it('saves pending dialogue changes with Ctrl+S', async () => {
        const writeDocument = installBridge();
        const user = userEvent.setup();
        renderEditor();

        const line = await screen.findByDisplayValue('Welcome.');
        await user.clear(line);
        await user.type(line, 'Saved now.');
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        expect(writeDocument.mock.calls[0][2]).toContain(
            'BARTENDER: Saved now.'
        );
    });

    it('saves paragraph breaks and returns to unquoted single-line source', async () => {
        const writeMultiline = installBridge();
        const firstView = renderEditor();
        const line = await screen.findByDisplayValue('Welcome.');

        fireEvent.change(line, {
            target: { value: 'First paragraph.\n\nSecond paragraph.' },
        });
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        await waitFor(() => expect(writeMultiline).toHaveBeenCalledOnce());
        const multilineSource = writeMultiline.mock.calls[0][2];
        expect(multilineSource).toContain(
            'BARTENDER: "First paragraph.\n  \n  Second paragraph."'
        );

        firstView.unmount();
        const writeSingleLine = installBridge(multilineSource);
        renderEditor();
        const multilineField = await screen.findByRole('textbox', {
            name: 'Line',
        });
        expect((multilineField as HTMLTextAreaElement).value).toBe(
            'First paragraph.\n\nSecond paragraph.'
        );
        fireEvent.change(multilineField, {
            target: { value: 'One line again.' },
        });
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        await waitFor(() => expect(writeSingleLine).toHaveBeenCalledOnce());
        const singleLineSource = writeSingleLine.mock.calls[0][2];
        expect(singleLineSource).toContain('BARTENDER: One line again.');
        expect(singleLineSource).not.toContain('BARTENDER: "One line again."');
    });

    it('renames a node, repoints choices, preserves comments, and shows clean targets', async () => {
        const writeDocument = installBridge();
        const user = userEvent.setup();
        const view = renderEditor();

        await screen.findByDisplayValue('Welcome.');
        for (const option of screen.getAllByRole('option')) {
            expect(option.textContent).not.toContain('→');
        }

        await user.click(screen.getByRole('button', { name: 'second' }));
        const id = screen.getByTitle('Node id (used by GOTO targets)');
        await user.clear(id);
        await user.type(id, 'finale');
        await user.tab();

        view.unmount();
        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        const saved = writeDocument.mock.calls[0][2];
        expect(saved).toContain('# Author comment must survive');
        expect(saved).toContain('NODE finale');
        expect(saved).toContain('GOTO finale');
        expect(saved).not.toContain('NODE second');
    });

    it('adds a playable terminal choice to a new node and flushes it on navigation', async () => {
        const writeDocument = installBridge();
        const user = userEvent.setup();
        const view = renderEditor();

        await user.click(await screen.findByRole('button', { name: '+ Node' }));
        const line = screen.getByRole('textbox', { name: 'Line' });
        await user.clear(line);
        await user.type(line, 'A new ending.');
        await user.click(screen.getByRole('button', { name: /Choice/ }));

        const choice = screen.getByRole('textbox', {
            name: 'Choice 1 text',
        });
        await user.clear(choice);
        await user.type(choice, 'Finish');
        const card = choice.closest<HTMLElement>('.dlg__card')!;
        await user.selectOptions(within(card).getByRole('combobox'), '__end__');

        view.unmount();
        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        const saved = writeDocument.mock.calls[0][2];
        expect(saved).toContain('NODE new_node');
        expect(saved).toContain('NARRATOR: A new ending.');
        expect(saved).toContain('CHOICE Finish');
        expect(saved).toContain('END dialogue');
    });

    it('saves choices in the order selected in the visual editor', async () => {
        const content = `NODE start
  NARRATOR: Choose.
  # first option
  CHOICE First
    END dialogue
  END
  # second option
  CHOICE Second
    END dialogue
  END
`;
        const writeDocument = installBridge(content);
        const user = userEvent.setup();
        const view = renderEditor();

        await screen.findByDisplayValue('First');
        await user.click(
            screen.getAllByRole('button', { name: 'Move choice down' })[0]
        );

        view.unmount();
        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        const saved = writeDocument.mock.calls[0][2];
        expect(saved.indexOf('CHOICE Second')).toBeLessThan(
            saved.indexOf('CHOICE First')
        );
        expect(saved.indexOf('# second option')).toBeLessThan(
            saved.indexOf('CHOICE Second')
        );
        expect(saved.indexOf('# first option')).toBeLessThan(
            saved.indexOf('CHOICE First')
        );
    });

    it('guides the author to Source when the dialogue cannot be parsed', async () => {
        installBridge('NODE start\n  this is not valid dialogue syntax\n');
        renderEditor();

        expect(
            await screen.findByText(/syntax error and can’t be shown visually/i)
        ).toBeTruthy();
        expect(screen.getByText(/Switch to Source to fix it/i)).toBeTruthy();
    });

    it('makes a node the start, deletes it, and saves a valid remaining dialogue', async () => {
        const writeDocument = installBridge();
        const user = userEvent.setup();
        const view = renderEditor();

        await user.click(await screen.findByRole('button', { name: 'second' }));
        await user.click(screen.getByRole('button', { name: 'Set as start' }));
        expect(
            within(screen.getByRole('button', { name: /second/ })).getByText(
                'start'
            )
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Delete node' }));
        expect(
            screen.getByText(/1 surviving route points here \(1 choice/)
        ).toBeTruthy();
        await user.click(
            screen.getAllByRole('button', { name: 'Delete node' }).at(-1)!
        );
        expect(screen.queryByRole('button', { name: /second/ })).toBeNull();
        expect(screen.getByDisplayValue('Welcome.')).toBeTruthy();

        view.unmount();
        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        const saved = writeDocument.mock.calls[0][2];
        expect(saved).toContain('NODE start');
        expect(saved).not.toContain('NODE second');
    });

    it('uses a unique id for added nodes and makes blank choices valid for validation', async () => {
        const content = `${source}
NODE new_node
  NARRATOR: Existing.
  END dialogue
`;
        const writeDocument = installBridge(content);
        const user = userEvent.setup();
        const view = renderEditor();

        await user.click(await screen.findByRole('button', { name: '+ Node' }));
        expect(screen.getByDisplayValue('new_node_2')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /Choice/ }));

        view.unmount();
        await waitFor(() => expect(writeDocument).toHaveBeenCalledOnce());
        const saved = writeDocument.mock.calls[0][2];
        expect(saved).toContain('NODE new_node_2');
        expect(saved).toContain('CHOICE @choice');
    });

    it('overwrites or recreates the dialogue when the author chooses to force a conflicted save', async () => {
        const writeDocument = installBridge();
        writeDocument
            .mockResolvedValueOnce({
                ok: false,
                conflict: true,
                content: 'NODE external\n  END dialogue\n',
                mtimeMs: 12,
            })
            .mockResolvedValue({
                ok: true,
                conflict: false,
                mtimeMs: 13,
            });
        const user = userEvent.setup();
        renderEditor();

        const line = await screen.findByDisplayValue('Welcome.');
        await user.clear(line);
        await user.type(line, 'Mine.');
        await user.click(
            await screen.findByRole(
                'button',
                { name: 'Overwrite' },
                { timeout: 2000 }
            )
        );
        await waitFor(() => expect(writeDocument).toHaveBeenCalledTimes(2));
        expect(writeDocument.mock.calls[1][3]).toBeUndefined();

        cleanup();
        const recreate = installBridge();
        recreate
            .mockResolvedValueOnce({
                ok: false,
                conflict: true,
                missing: true,
                mtimeMs: 0,
            })
            .mockResolvedValue({
                ok: true,
                conflict: false,
                mtimeMs: 1,
            });
        renderEditor();
        const recreatedLine = await screen.findByDisplayValue('Welcome.');
        await user.clear(recreatedLine);
        await user.type(recreatedLine, 'Recreated.');
        await user.click(
            await screen.findByRole(
                'button',
                { name: 'Recreate it' },
                { timeout: 2000 }
            )
        );
        await waitFor(() => expect(recreate).toHaveBeenCalledTimes(2));
        expect(recreate.mock.calls[1][3]).toBeUndefined();
    });

    it('reports document read failures in the visual editor', async () => {
        installBridge(source, new Error('file unavailable'));
        renderEditor();
        expect(
            await screen.findByText(/syntax error and can’t be shown visually/i)
        ).toBeTruthy();
        expect(screen.getByText(/file unavailable/)).toBeTruthy();
    });
});
