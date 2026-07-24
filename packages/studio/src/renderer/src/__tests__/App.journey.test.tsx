// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../shell/SourceView', () => ({ SourceView: () => null }));

import { App } from '../App';
import type { OpenProject, StudioApi } from '../../../shared/project';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test Project',
    version: '1.0.0',
    registry: {
        locations: {
            old_town: {
                id: 'old_town',
                name: 'Old Town',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
            market: {
                id: 'market',
                name: 'Market',
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
        startLocation: 'old_town',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    },
    files: {
        'locations:old_town': 'content/locations/old_town.yaml',
        'locations:market': 'content/locations/market.yaml',
    },
    problems: [],
    engine: {
        declared: 'workspace:*',
        installed: '0.1.3',
        current: '0.2.1',
        updateAvailable: false,
        versionMismatch: false,
        depsInstalled: true,
        packageManager: 'yarn',
    },
};

function installBridge() {
    const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => ({
        ok: true,
        conflict: false,
        mtimeMs: 20,
    }));
    const unsubscribe = () => {};
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            listRecentProjects: vi.fn(async () => []),
            openProject: vi.fn(async () => project),
            onBuildLog: vi.fn(() => unsubscribe),
            onInstallLog: vi.fn(() => unsubscribe),
            onPreviewLog: vi.fn(() => unsubscribe),
            onMenu: vi.fn(() => unsubscribe),
            setThemeMenuState: vi.fn(),
            readDocument: vi.fn(async (_dir: string, path: string) => ({
                content: path.includes('old_town')
                    ? 'id: old_town\nname: Old Town\ndescription: Original.\n'
                    : 'id: market\nname: Market\ndescription: Stalls.\n',
                mtimeMs: path.includes('old_town') ? 10 : 11,
            })),
            writeEntity,
        },
    });
    return { writeEntity };
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Studio author journeys', () => {
    it('opens the full flags and variables page from the dock strip', async () => {
        installBridge();
        const user = userEvent.setup();
        render(<App />);

        await user.click(
            await screen.findByRole('button', { name: 'Open project…' })
        );
        await user.click(screen.getByRole('button', { name: /Flags & vars/ }));

        expect(
            screen.getByRole('heading', { name: 'Flags & variables' })
        ).toBeTruthy();
        expect(
            screen.getByText('No flags or variables are used yet.')
        ).toBeTruthy();
    });

    it('opens a project, edits an entity, and saves it when navigating to another file', async () => {
        const { writeEntity } = installBridge();
        const user = userEvent.setup();
        render(<App />);

        await user.click(
            await screen.findByRole('button', { name: 'Open project…' })
        );
        await user.click(
            await screen.findByRole('button', { name: 'old_town' })
        );

        const name = await screen.findByDisplayValue('Old Town');
        await user.clear(name);
        await user.type(name, 'Renamed Town');

        await user.click(screen.getByRole('button', { name: 'market' }));

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity.mock.calls[0]).toEqual([
            project.projectDir,
            'content/locations/old_town.yaml',
            [{ path: ['name'], value: 'Renamed Town' }],
            10,
        ]);
        expect(await screen.findByDisplayValue('Market')).toBeTruthy();
    });
});
