// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityForm } from '../EntityForm';
import type { OpenProject, StudioApi } from '../../../../shared/project';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test',
    version: '1.0.0',
    registry: {
        locations: {
            town: {
                id: 'town',
                name: 'Old Town',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
        },
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
        startLocation: 'town',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    },
    files: { 'locations:town': 'content/locations/town.yaml' },
    problems: [],
    engine: {
        declared: 'workspace:*',
        installed: '0.1.3',
        depsInstalled: true,
        packageManager: 'yarn',
    },
};

function installBridge(writeEntity: StudioApi['writeEntity']) {
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument: vi.fn(async () => ({
                content:
                    'id: town\nname: Old Town\ndescription: A quiet place.\n',
                mtimeMs: 10,
            })),
            writeEntity,
        },
    });
}

function renderEditor() {
    return render(
        <EntityForm
            project={project}
            tabKey="locations:town"
            section="locations"
            path="content/locations/town.yaml"
            onDirty={() => {}}
            onModified={() => {}}
        />
    );
}

beforeEach(() => vi.useRealTimers());
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe('EntityForm author journeys', () => {
    it('autosaves the latest field value after the author stops typing', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        }));
        installBridge(writeEntity);
        renderEditor();

        const name = await screen.findByDisplayValue('Old Town');
        const user = userEvent.setup();
        await user.clear(name);
        await user.type(name, 'New Town');

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce(), {
            timeout: 2000,
        });
        expect(writeEntity.mock.calls[0]).toEqual([
            project.projectDir,
            'content/locations/town.yaml',
            [{ path: ['name'], value: 'New Town' }],
            10,
        ]);
    });

    it('flushes a quick edit when the author immediately leaves the editor', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        }));
        installBridge(writeEntity);
        const view = renderEditor();
        const user = userEvent.setup();

        const name = await screen.findByDisplayValue('Old Town');
        await user.clear(name);
        await user.type(name, 'New Town');
        view.unmount();

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity.mock.calls[0][2]).toEqual([
            { path: ['name'], value: 'New Town' },
        ]);
    });

    it('saves a pending edit when the author presses Ctrl+S', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        }));
        installBridge(writeEntity);
        renderEditor();
        const user = userEvent.setup();

        const name = await screen.findByDisplayValue('Old Town');
        await user.clear(name);
        await user.type(name, 'Saved Town');
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity.mock.calls[0][2]).toEqual([
            { path: ['name'], value: 'Saved Town' },
        ]);
    });

    it('keeps the author in control when an autosave sees an external conflict', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: false,
            conflict: true,
            mtimeMs: 12,
            content: 'id: town\nname: External Town\n',
        }));
        installBridge(writeEntity);
        renderEditor();

        const name = await screen.findByDisplayValue('Old Town');
        const user = userEvent.setup();
        await user.clear(name);
        await user.type(name, 'My Town');

        expect(
            await screen.findByText(/changed on disk/i, undefined, {
                timeout: 2000,
            })
        ).toBeTruthy();
        expect((name as HTMLInputElement).value).toBe('My Town');
    });

    it('tells the author when the file was deleted instead of silently recreating it', async () => {
        const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
            ok: false,
            conflict: true,
            missing: true,
            mtimeMs: 0,
        }));
        installBridge(writeEntity);
        renderEditor();

        const user = userEvent.setup();
        const name = await screen.findByDisplayValue('Old Town');
        await user.clear(name);
        await user.type(name, 'My Town');

        expect(
            await screen.findByText(/deleted outside Studio/i, undefined, {
                timeout: 2000,
            })
        ).toBeTruthy();
        expect((name as HTMLInputElement).value).toBe('My Town');
    });
});
