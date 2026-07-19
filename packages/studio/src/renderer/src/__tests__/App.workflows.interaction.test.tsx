// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject, StudioApi } from '../../../shared/project';

vi.mock('../shell/Welcome', () => ({
    Welcome: (props: any) => (
        <div>
            <span>{props.loading ? 'welcome-loading' : 'welcome-ready'}</span>
            {props.error && <span>{props.error}</span>}
            <button onClick={props.onOpen}>Welcome open</button>
            <button onClick={props.onNew}>Welcome new</button>
            <button onClick={() => props.onOpenRecent('C:/recent')}>
                Welcome recent
            </button>
        </div>
    ),
}));

vi.mock('../shell/NewProjectModal', () => ({
    NewProjectModal: (props: any) => (
        <div className="modal-backdrop">
            {props.error && <div role="alert">{props.error}</div>}
            <button
                onClick={() =>
                    props.onCreate({
                        name: 'Created',
                        title: 'Created Game',
                        subtitle: 'Created Subtitle',
                        targetDir: 'C:/games',
                        useDefaultRenderer: true,
                        useStarterStyles: true,
                        localizationMode: 'literal',
                    })
                }
            >
                Submit new project
            </button>
            <button onClick={props.onCancel}>Cancel new project</button>
        </div>
    ),
}));

vi.mock('../shell/TopBar', () => ({
    TopBar: (props: any) => (
        <div>
            <span>{props.stale ? 'stale-files' : 'fresh-files'}</span>
            <button onClick={props.onOpen}>Top open</button>
            <button onClick={props.onValidate}>Validate</button>
            <button onClick={props.onBuild} disabled={!props.canBuild}>
                Build
            </button>
            <button onClick={props.onStartPreview}>Start preview</button>
            <button onClick={props.onStopPreview}>Stop preview</button>
            <button onClick={props.onOpenPreview}>Open preview</button>
            <button onClick={props.onPlaytest}>Open playtest</button>
            <button onClick={props.onOpenPalette}>Open palette</button>
        </div>
    ),
}));

vi.mock('../shell/EngineBanner', () => ({
    EngineBanner: (props: any) =>
        props.engine.depsInstalled ? null : (
            <button onClick={props.onInstall}>Install dependencies</button>
        ),
}));

vi.mock('../shell/LeftRail', () => ({
    LeftRail: (props: any) => (
        <div>
            <button
                onClick={() => props.onOpenItem('characters', 'hero', 'Hero')}
            >
                Open hero
            </button>
            <button onClick={() => props.onNewItem('items')}>New item</button>
            <button
                onClick={() => props.onDeleteItem('characters', 'hero', 'Hero')}
            >
                Delete hero
            </button>
            <button onClick={() => props.onRenameItem('characters', 'hero')}>
                Rename hero
            </button>
        </div>
    ),
}));

vi.mock('../shell/EditorArea', () => ({
    EditorArea: (props: any) => (
        <div>
            <span>{props.activeKey ?? 'no-active-tab'}</span>
            <span>{props.dirtyTabs.size ? 'dirty-tab' : 'clean-tab'}</span>
            <button onClick={() => props.onDirty('characters:hero', true)}>
                Mark dirty
            </button>
            <button
                onClick={() => props.onModified('content/characters/hero.yaml')}
            >
                Mark modified
            </button>
            <button
                onClick={() => props.onSetViewMode('characters:hero', 'source')}
            >
                Source mode
            </button>
            <button onClick={() => props.onClose('characters:hero')}>
                Close hero tab
            </button>
        </div>
    ),
    type: {},
}));

vi.mock('../shell/RightPanel', () => ({
    RightPanel: (props: any) => (
        <button
            onClick={() => props.onOpenFile('content/characters/hero.yaml')}
        >
            Open referenced file
        </button>
    ),
}));

vi.mock('../shell/BottomDock', () => ({
    BottomDock: (props: any) => (
        <div>
            <span>dock:{props.activeTab}</span>
            <span>{props.buildLog.join('|')}</span>
            <span>{props.installLog.join('|')}</span>
            <span>{props.previewLog.join('|')}</span>
            <button
                onClick={() =>
                    props.onOpenProblem({
                        file: 'content/characters/hero.yaml',
                        message: 'line 3: bad hero',
                        severity: 'error',
                    })
                }
            >
                Open problem
            </button>
            <button onClick={() => props.onRenameFlagVar('flag', 'met_hero')}>
                Rename flag
            </button>
            <button onClick={props.onCancelBuild}>Cancel build</button>
            <button onClick={props.onRebuild}>Rebuild</button>
            <button onClick={props.onOpenOutput}>Open output</button>
            <button onClick={() => props.onTabChange('symbols')}>
                Symbols tab
            </button>
        </div>
    ),
}));

vi.mock('../shell/ResizeHandle', () => ({
    ResizeHandle: (props: any) => (
        <button onClick={() => props.onResize(props.min)}>
            Resize {props.axis}
        </button>
    ),
}));

vi.mock('../shell/CreateItemModal', () => ({
    CreateItemModal: (props: any) => (
        <div>
            <button
                onClick={() => props.onCreate(props.initialSection, 'new_item')}
            >
                Submit new item
            </button>
            <button onClick={props.onCancel}>Cancel new item</button>
        </div>
    ),
}));

vi.mock('../shell/RenameModal', () => ({
    RenameModal: (props: any) => (
        <div>
            <span>references:{props.referenceCount}</span>
            <button onClick={() => props.onRename('renamed')}>
                Submit rename
            </button>
            <button onClick={props.onCancel}>Cancel rename</button>
        </div>
    ),
}));

vi.mock('../shell/ConfirmModal', () => ({
    ConfirmModal: (props: any) => (
        <div>
            <span>{props.message}</span>
            <button onClick={props.onConfirm}>Confirm deletion</button>
            <button onClick={props.onCancel}>Cancel deletion</button>
        </div>
    ),
}));

vi.mock('../shell/FlagVarRenameModal', () => ({
    FlagVarRenameModal: (props: any) => (
        <div>
            <span>uses:{props.usageCount}</span>
            <button onClick={() => props.onRename('met_friend')}>
                Submit flag rename
            </button>
            <button onClick={props.onCancel}>Cancel flag rename</button>
        </div>
    ),
}));

vi.mock('../shell/CommandPalette', () => ({
    CommandPalette: (props: any) => (
        <div>
            {props.commands.map((command: any) => (
                <button key={command.id} onClick={command.run}>
                    Palette {command.label}
                </button>
            ))}
            <button onClick={props.onClose}>Close palette</button>
        </div>
    ),
}));

import { App } from '../App';

function makeProject(depsInstalled = true): OpenProject {
    return {
        projectDir: 'C:/story',
        name: 'Story',
        version: '1.0.0',
        registry: {
            locations: {
                town: {
                    id: 'town',
                    name: 'Town',
                    description: '',
                    banner: '',
                    music: '',
                    ambient: '',
                },
            },
            characters: {
                hero: {
                    id: 'hero',
                    name: 'Hero',
                    biography: '',
                    portrait: '',
                    location: 'town',
                    dialogue: '',
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
            startLocation: 'town',
            startTime: { day: 1, hour: 8 },
            startFlags: { met_hero: true },
            startVariables: {},
            startInventory: [],
        },
        files: {
            'characters:hero': 'content/characters/hero.yaml',
            'locations:town': 'content/locations/town.yaml',
        },
        problems: [],
        engine: {
            declared: 'workspace:*',
            installed: depsInstalled ? '0.1.3' : null,
            depsInstalled,
            packageManager: 'yarn',
        },
    };
}

type Callbacks = {
    build?: (dir: string, line: string) => void;
    install?: (dir: string, line: string) => void;
    preview?: (dir: string, line: string) => void;
    menu?: Parameters<StudioApi['onMenu']>[0];
};

function installBridge(
    overrides: Partial<StudioApi> = {},
    initialProject = makeProject()
) {
    const callbacks: Callbacks = {};
    const bridge = {
        listRecentProjects: vi.fn(async () => [
            { name: 'Recent', path: 'C:/recent' },
        ]),
        openProject: vi.fn(async () => initialProject),
        openProjectPath: vi.fn(async () => initialProject),
        createProject: vi.fn(async () => initialProject),
        checkProjectDestination: vi.fn(async () => ({ available: true })),
        chooseDirectory: vi.fn(async () => 'C:/games'),
        revalidate: vi.fn(async () => initialProject),
        build: vi.fn(async () => ({
            ok: true,
            cancelled: false,
            durationMs: 10,
            errors: [],
            logs: ['done'],
            outDir: 'C:/story/dist',
            outputFiles: ['index.html'],
        })),
        cancelBuild: vi.fn(),
        installDependencies: vi.fn(async () => ({ ok: true, code: 0 })),
        packageManager: vi.fn(async () => 'yarn'),
        startPreview: vi.fn(async () => ({
            projectDir: 'C:/story',
            url: 'http://localhost:4173',
        })),
        stopPreview: vi.fn(async () => {}),
        openPreview: vi.fn(async () => {}),
        openPath: vi.fn(async () => {}),
        reportError: vi.fn(),
        readDocument: vi.fn(async () => ({ content: '', mtimeMs: 1 })),
        writeDocument: vi.fn(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        })),
        writeEntity: vi.fn(async () => ({
            ok: true,
            conflict: false,
            mtimeMs: 2,
        })),
        deleteDocument: vi.fn(async () => {}),
        renameDocument: vi.fn(async () => {}),
        writeRecovery: vi.fn(async () => {}),
        readRecovery: vi.fn(async () => null),
        clearRecovery: vi.fn(async () => {}),
        onBuildLog: vi.fn((callback) => {
            callbacks.build = callback;
            return () => {};
        }),
        onInstallLog: vi.fn((callback) => {
            callbacks.install = callback;
            return () => {};
        }),
        onPreviewLog: vi.fn((callback) => {
            callbacks.preview = callback;
            return () => {};
        }),
        onMenu: vi.fn((handlers) => {
            callbacks.menu = handlers;
            return () => {};
        }),
        setThemeMenuState: vi.fn(),
        ...overrides,
    } as unknown as StudioApi;
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: bridge,
    });
    return { bridge, callbacks };
}

async function openApp() {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Welcome open' }));
    await screen.findByText('dock:problems');
    return user;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('App workflows', () => {
    it('suppresses the Ctrl+K palette shortcut while a modal is open', async () => {
        const { callbacks } = installBridge();
        const user = await openApp();

        act(() => callbacks.menu?.onNew());
        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(
            screen.queryByRole('button', { name: 'Close palette' })
        ).toBeNull();

        await user.click(
            screen.getByRole('button', { name: 'Cancel new project' })
        );
        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(
            screen.getByRole('button', { name: 'Close palette' })
        ).toBeTruthy();
    });

    it('handles failed opens, recent projects, project creation, and menu events', async () => {
        const openProject = vi
            .fn<StudioApi['openProject']>()
            .mockRejectedValueOnce(new Error('not a project'))
            .mockResolvedValueOnce(null);
        const { bridge, callbacks } = installBridge({ openProject });
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('button', { name: 'Welcome open' }));
        expect(await screen.findByText('not a project')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Welcome recent' })
        );
        await screen.findByText('dock:problems');
        expect(bridge.openProjectPath).toHaveBeenCalledWith('C:/recent');

        act(() => callbacks.menu?.onThemeMode('light'));
        act(() => callbacks.menu?.onThemeColor('red'));
        expect(document.documentElement.dataset.theme).toBe('light');
        expect(document.documentElement.dataset.accent).toBe('red');
        act(() => callbacks.menu?.onNew());
        await user.click(
            screen.getByRole('button', { name: 'Submit new project' })
        );
        expect(bridge.createProject).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Created' })
        );
        act(() => callbacks.menu?.onAbout('0.2.0'));
        expect(
            screen.getByRole('dialog', { name: 'Doodle Studio' })
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Close' }));
    });

    it('keeps project creation open and displays creation failures', async () => {
        const createProject = vi
            .fn<StudioApi['createProject']>()
            .mockRejectedValue(new Error('folder already exists'));
        const { callbacks } = installBridge({ createProject });
        const user = await openApp();

        act(() => callbacks.menu?.onNew());
        await user.click(
            screen.getByRole('button', { name: 'Submit new project' })
        );

        expect((await screen.findByRole('alert')).textContent).toContain(
            'folder already exists'
        );
        expect(
            screen.getByRole('button', { name: 'Submit new project' })
        ).toBeTruthy();
    });

    it('runs validation, install, build, preview, streamed logs, and output actions', async () => {
        const withoutDeps = makeProject(false);
        const withDeps = makeProject(true);
        const revalidate = vi.fn(async () => withDeps);
        const { bridge, callbacks } = installBridge(
            { revalidate },
            withoutDeps
        );
        const user = await openApp();

        await user.click(
            screen.getByRole('button', { name: 'Install dependencies' })
        );
        await waitFor(() =>
            expect(bridge.installDependencies).toHaveBeenCalledWith('C:/story')
        );
        await waitFor(() =>
            expect(
                screen
                    .getByRole('button', { name: 'Build' })
                    .hasAttribute('disabled')
            ).toBe(false)
        );

        act(() => {
            callbacks.build?.('C:/other', 'ignore-build');
            callbacks.build?.('C:/story', 'build-line');
            callbacks.install?.('C:/story', 'install-line');
            callbacks.preview?.('C:/story', 'preview-line');
        });
        expect(screen.queryByText('ignore-build')).toBeNull();
        expect(screen.getByText('build-line')).toBeTruthy();
        expect(screen.getByText('install-line')).toBeTruthy();
        expect(screen.getByText('preview-line')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Validate' }));
        expect(revalidate).toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Build' }));
        await waitFor(() =>
            expect(bridge.build).toHaveBeenCalledWith('C:/story')
        );
        await user.click(screen.getByRole('button', { name: 'Open output' }));
        expect(bridge.openPath).toHaveBeenCalledWith('C:/story/dist');
        await user.click(screen.getByRole('button', { name: 'Cancel build' }));
        expect(bridge.cancelBuild).toHaveBeenCalledOnce();

        await user.click(screen.getByRole('button', { name: 'Start preview' }));
        await waitFor(() =>
            expect(bridge.startPreview).toHaveBeenCalledWith('C:/story')
        );
        await user.click(screen.getByRole('button', { name: 'Open preview' }));
        expect(bridge.openPreview).toHaveBeenCalledOnce();
        await user.click(screen.getByRole('button', { name: 'Stop preview' }));
        expect(bridge.stopPreview).toHaveBeenCalledOnce();
    });

    it('coordinates content creation, problem navigation, dirty state, tabs, and deletion', async () => {
        const { bridge } = installBridge();
        const user = await openApp();

        await user.click(screen.getByRole('button', { name: 'Open hero' }));
        expect(screen.getByText('characters:hero')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Mark dirty' }));
        expect(screen.getByText('dirty-tab')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Mark modified' }));
        expect(screen.getByText('stale-files')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Open problem' }));
        await user.click(
            screen.getByRole('button', { name: 'Open referenced file' })
        );
        await user.click(
            screen.getByRole('button', { name: 'Close hero tab' })
        );
        expect(screen.getByText('no-active-tab')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'New item' }));
        await user.click(
            screen.getByRole('button', { name: 'Submit new item' })
        );
        expect(bridge.writeDocument).toHaveBeenCalledWith(
            'C:/story',
            'content/items/new_item.yaml',
            expect.stringContaining('id: new_item')
        );

        await user.click(screen.getByRole('button', { name: 'Delete hero' }));
        expect(screen.getByText(/Nothing else references it/)).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Confirm deletion' })
        );
        expect(bridge.deleteDocument).toHaveBeenCalledWith(
            'C:/story',
            'content/characters/hero.yaml'
        );
        expect(screen.getByText('items:new_item')).toBeTruthy();
    });

    it('applies entity and flag renames and exposes command-palette actions', async () => {
        const { bridge } = installBridge();
        const user = await openApp();

        await user.click(screen.getByRole('button', { name: 'Rename hero' }));
        await user.click(screen.getByRole('button', { name: 'Submit rename' }));
        await waitFor(() =>
            expect(bridge.renameDocument).toHaveBeenCalledWith(
                'C:/story',
                'content/characters/hero.yaml',
                'content/characters/renamed.yaml'
            )
        );
        expect(bridge.writeEntity).toHaveBeenCalledWith(
            'C:/story',
            'content/characters/hero.yaml',
            [{ path: ['id'], value: 'renamed' }]
        );

        await user.click(screen.getByRole('button', { name: 'Rename flag' }));
        await user.click(
            screen.getByRole('button', { name: 'Submit flag rename' })
        );
        await waitFor(() =>
            expect(bridge.writeEntity).toHaveBeenCalledWith(
                'C:/story',
                'content/game.yaml',
                expect.any(Array)
            )
        );

        await user.click(screen.getByRole('button', { name: 'Open palette' }));
        await user.click(
            screen.getByRole('button', { name: 'Palette Playtest' })
        );
        expect(screen.getByText('dock:playtest')).toBeTruthy();
        expect(
            Number.parseInt(
                document
                    .querySelector<HTMLElement>('.app')!
                    .style.getPropertyValue('--dock-h'),
                10
            )
        ).toBeGreaterThanOrEqual(360);
        await user.click(screen.getByRole('button', { name: 'Open palette' }));
        await user.click(
            screen.getByRole('button', { name: 'Palette Theme: Neon City' })
        );
        expect(document.documentElement.dataset.theme).toBe('neon');
    });
});
