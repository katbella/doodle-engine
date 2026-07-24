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
import { GameConfigForm } from '../GameConfigForm';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test',
    version: '1.0.0',
    registry: {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
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
        items: {
            coin: {
                id: 'coin',
                name: 'Coin',
                description: '',
                icon: '',
                image: '',
                location: 'inventory',
                stats: {},
            },
        },
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    },
    config: {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: { introSeen: false },
        startVariables: { gold: 5 },
        startInventory: [],
    },
    files: { game: 'game.yaml' },
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

const source = `# This comment and shell block must survive form saves
startLocation: tavern
startTime: { day: 1, hour: 8 }
startFlags: { introSeen: false }
startVariables: { gold: 5 }
startInventory: []
shell:
  title:
    subtitle: Keep me
`;

function installBridge(
    result: Awaited<ReturnType<StudioApi['writeEntity']>>,
    {
        content = source,
        readError = null as Error | null,
    }: { content?: string; readError?: Error | null } = {}
) {
    const writeEntity = vi.fn<StudioApi['writeEntity']>(async () => result);
    const importAsset = vi.fn<StudioApi['importAsset']>(async () => null);
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument: vi.fn(async () => {
                if (readError) throw readError;
                return { content, mtimeMs: 10 };
            }),
            writeEntity,
            importAsset,
        },
    });
    return { writeEntity, importAsset };
}

function renderForm() {
    return render(
        <GameConfigForm
            project={project}
            tabKey="game"
            path="game.yaml"
            onDirty={() => {}}
            onModified={() => {}}
        />
    );
}

afterEach(cleanup);

describe('GameConfigForm author journeys', () => {
    it('saves pending configuration changes with Cmd+S', async () => {
        const { writeEntity } = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        });
        const user = userEvent.setup();
        renderForm();

        await user.selectOptions(
            await screen.findByLabelText('Location'),
            'market'
        );
        fireEvent.keyDown(window, { key: 's', metaKey: true });

        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity.mock.calls[0][2]).toEqual([
            { path: ['startLocation'], value: 'market' },
        ]);
    });

    it('does not save an invalid flag name', async () => {
        const { writeEntity } = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        });
        const user = userEvent.setup();
        renderForm();

        await user.click(
            await screen.findByRole('button', { name: 'Add flag' })
        );
        const name = screen.getByDisplayValue('newFlag');
        await user.clear(name);
        await user.type(name, 'seen-intro');

        expect(
            screen.getByText('Use letters, numbers, and underscores only.')
        ).toBeTruthy();
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });
        expect(writeEntity).not.toHaveBeenCalled();
    });

    it('saves all owned configuration fields without touching the shell block', async () => {
        const { writeEntity } = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        });
        const user = userEvent.setup();
        const view = renderForm();

        await user.selectOptions(
            await screen.findByLabelText('Location'),
            'market'
        );
        const day = screen.getByLabelText('Day');
        await user.clear(day);
        await user.type(day, '2');

        const flags = screen.getByText('Flags').closest<HTMLElement>('.field')!;
        await user.selectOptions(within(flags).getByRole('combobox'), 'true');

        const gold = screen.getByDisplayValue('5');
        await user.clear(gold);
        await user.type(gold, '12');

        const inventory = screen
            .getByText('Initial inventory')
            .closest<HTMLElement>('.field')!;
        await user.selectOptions(
            within(inventory).getByRole('combobox'),
            'coin'
        );

        view.unmount();
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());

        expect(writeEntity).toHaveBeenCalledWith(
            project.projectDir,
            'game.yaml',
            [
                { path: ['startLocation'], value: 'market' },
                { path: ['startTime'], value: { day: 2, hour: 8 } },
                { path: ['startFlags'], value: { introSeen: true } },
                { path: ['startVariables'], value: { gold: 12 } },
                { path: ['startInventory'], value: ['coin'] },
            ],
            10
        );
        expect(writeEntity.mock.calls[0][2]).not.toContainEqual({
            path: ['shell'],
            value: expect.anything(),
        });
    });

    it('shows an external-deletion warning and does not keep autosaving', async () => {
        const { writeEntity } = installBridge({
            ok: false,
            conflict: true,
            missing: true,
            mtimeMs: 0,
        });
        const user = userEvent.setup();
        renderForm();

        await user.selectOptions(
            await screen.findByLabelText('Location'),
            'market'
        );

        expect(
            await screen.findByText(/deleted outside Studio/i, undefined, {
                timeout: 2000,
            })
        ).toBeTruthy();
        expect(writeEntity).toHaveBeenCalledOnce();
    });

    it('renames, adds, and removes initial flags, variables, and inventory entries', async () => {
        const { writeEntity } = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        });
        const user = userEvent.setup();
        const view = renderForm();

        await user.click(
            await screen.findByRole('button', { name: 'Add flag' })
        );
        const newFlag = screen.getByDisplayValue('newFlag');
        await user.clear(newFlag);
        await user.type(newFlag, 'questStarted');
        await user.click(
            screen.getByRole('button', { name: 'Remove introSeen' })
        );

        await user.click(screen.getByRole('button', { name: 'Add variable' }));
        const newVariable = screen.getByDisplayValue('newVar');
        await user.clear(newVariable);
        await user.type(newVariable, 'heroName');
        const variableValue = screen.getByDisplayValue('0');
        await user.clear(variableValue);
        await user.type(variableValue, 'Kat');
        await user.click(screen.getByRole('button', { name: 'Remove gold' }));

        const inventory = screen
            .getByText('Initial inventory')
            .closest<HTMLElement>('.field')!;
        await user.selectOptions(
            within(inventory).getByRole('combobox'),
            'coin'
        );
        await user.click(screen.getByRole('button', { name: 'Remove coin' }));

        view.unmount();
        await waitFor(() => expect(writeEntity).toHaveBeenCalledOnce());
        expect(writeEntity.mock.calls[0][2]).toEqual([
            {
                path: ['startFlags'],
                value: { questStarted: false },
            },
            {
                path: ['startVariables'],
                value: { heroName: 'Kat' },
            },
        ]);
    });

    it('forces an overwrite after an external-change conflict', async () => {
        const { writeEntity } = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 12,
        });
        writeEntity.mockResolvedValueOnce({
            ok: false,
            conflict: true,
            mtimeMs: 11,
        });
        const user = userEvent.setup();
        renderForm();

        await user.selectOptions(
            await screen.findByLabelText('Location'),
            'market'
        );
        const overwrite = await screen.findByRole(
            'button',
            { name: 'Overwrite' },
            { timeout: 2000 }
        );
        await user.click(overwrite);

        await waitFor(() => expect(writeEntity).toHaveBeenCalledTimes(2));
        expect(writeEntity.mock.calls[1][3]).toBeUndefined();
    });

    it('shows read errors and the shell guidance for a minimal config', async () => {
        installBridge(
            { ok: true, conflict: false, mtimeMs: 11 },
            { readError: new Error('access denied') }
        );
        const failed = renderForm();
        expect(
            await screen.findByText('game.yaml could not be read.')
        ).toBeTruthy();
        expect(screen.getByText('access denied')).toBeTruthy();
        failed.unmount();

        installBridge(
            { ok: true, conflict: false, mtimeMs: 11 },
            {
                content: `startLocation: ''
startTime: {}
startFlags: {}
startVariables: {}
startInventory: []
`,
            }
        );
        renderForm();
        expect(await screen.findByText('Splash screen')).toBeTruthy();
        expect(screen.getByLabelText('Title background')).toBeTruthy();
        expect(screen.getAllByText('None.')).toHaveLength(3);
    });

    it('imports shell screen assets and preserves unmodeled shell fields', async () => {
        const bridge = installBridge({
            ok: true,
            conflict: false,
            mtimeMs: 11,
        });
        bridge.importAsset
            .mockResolvedValueOnce('assets/images/ui/title.png')
            .mockResolvedValueOnce('assets/audio/ui/splash.ogg');
        const user = userEvent.setup();
        const view = renderForm();

        await user.click(
            await screen.findByRole('button', {
                name: 'Choose Title background file',
            })
        );
        await user.click(
            screen.getByRole('button', { name: 'Choose Splash sound file' })
        );

        expect(bridge.importAsset).toHaveBeenNthCalledWith(
            1,
            project.projectDir,
            'shellImage'
        );
        expect(bridge.importAsset).toHaveBeenNthCalledWith(
            2,
            project.projectDir,
            'shellSound'
        );

        view.unmount();
        await waitFor(() => expect(bridge.writeEntity).toHaveBeenCalledOnce());
        expect(bridge.writeEntity.mock.calls[0][2]).toEqual([
            {
                path: ['shell', 'splash', 'sound'],
                value: 'assets/audio/ui/splash.ogg',
            },
            {
                path: ['shell', 'title', 'background'],
                value: 'assets/images/ui/title.png',
            },
        ]);
    });
});
