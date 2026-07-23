import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: any[]) => any;

const state = vi.hoisted(() => {
    const ipcHandlers = new Map<string, Listener>();
    const ipcListeners = new Map<string, Listener>();
    const appListeners = new Map<string, Listener>();
    const windows: any[] = [];
    const forked: any[] = [];
    const spawned: any[] = [];

    const webContents = { send: vi.fn() };
    const browserWindow = {
        once: vi.fn((_event: string, listener: Listener) => listener()),
        show: vi.fn(),
        loadURL: vi.fn(),
        loadFile: vi.fn(),
        isDestroyed: vi.fn(() => false),
        webContents,
    };
    const BrowserWindow = vi.fn(function (options: unknown) {
        windows.push(browserWindow);
        state.lastWindowOptions = options;
        return browserWindow;
    }) as any;
    BrowserWindow.getAllWindows = vi.fn(() => windows);

    const makeProcess = () => {
        const listeners = new Map<string, Listener>();
        const proc = {
            on: vi.fn((event: string, listener: Listener) => {
                listeners.set(event, listener);
                return proc;
            }),
            postMessage: vi.fn(),
            kill: vi.fn(),
            emit: (event: string, ...args: any[]) =>
                listeners.get(event)?.(...args),
        };
        return proc;
    };

    const makeChild = () => {
        const listeners = new Map<string, Listener>();
        const stdoutListeners = new Map<string, Listener>();
        const stderrListeners = new Map<string, Listener>();
        const child = {
            stdout: {
                on: vi.fn((event: string, listener: Listener) =>
                    stdoutListeners.set(event, listener)
                ),
            },
            stderr: {
                on: vi.fn((event: string, listener: Listener) =>
                    stderrListeners.set(event, listener)
                ),
            },
            on: vi.fn((event: string, listener: Listener) => {
                listeners.set(event, listener);
                return child;
            }),
            emit: (event: string, ...args: any[]) =>
                listeners.get(event)?.(...args),
            emitStdout: (value: string) =>
                stdoutListeners.get('data')?.(Buffer.from(value)),
            emitStderr: (value: string) =>
                stderrListeners.get('data')?.(Buffer.from(value)),
        };
        return child;
    };

    const projects = {
        open: vi.fn(),
        openPath: vi.fn(),
        create: vi.fn(),
        checkDestination: vi.fn(),
        chooseDirectory: vi.fn(),
        listRecent: vi.fn(),
        reload: vi.fn(),
    };
    const documents = {
        read: vi.fn(),
        write: vi.fn(),
        writeEntityFields: vi.fn(),
        delete: vi.fn(),
        renameFile: vi.fn(),
    };
    const recovery = {
        save: vi.fn(),
        read: vi.fn(),
        clear: vi.fn(),
    };
    const watch = vi.fn();
    const readEngineInfo = vi.fn();
    const detectPackageManager = vi.fn();
    const syncThemeMenuChecks = vi.fn();
    const createThemeMenu = vi.fn(() => ({ label: 'Themes' }));
    const errorLog = {
        path: 'C:/studio-data/doodle-studio.log',
        initialize: vi.fn(async () => {}),
        write: vi.fn(async () => {}),
    };
    const ErrorLog = vi.fn(function () {
        return errorLog;
    });
    const studioUpdater = {
        getState: vi.fn((): any => ({
            status: 'idle',
            currentVersion: '0.2.0',
        })),
        checkForUpdates: vi.fn(async () => {}),
        openDownload: vi.fn(async () => {}),
    };
    const shell = {
        openExternal: vi.fn(),
        openPath: vi.fn(),
    };
    const showOpenDialog = vi.fn();
    const app = {
        isPackaged: true,
        whenReady: vi.fn(() => ({
            then: (listener: Listener) => {
                state.ready = listener;
            },
        })),
        getPath: vi.fn(() => 'C:/studio-data'),
        getVersion: vi.fn(() => '0.2.0'),
        on: vi.fn((event: string, listener: Listener) => {
            appListeners.set(event, listener);
        }),
        quit: vi.fn(),
    };
    const menu = { getMenuItemById: vi.fn() };
    const Menu = {
        buildFromTemplate: vi.fn((template: any[]) => {
            state.menuTemplate = template;
            return menu;
        }),
        setApplicationMenu: vi.fn(),
        getApplicationMenu: vi.fn(() => menu),
    };
    const utilityProcess = {
        fork: vi.fn(() => {
            const proc = makeProcess();
            forked.push(proc);
            return proc;
        }),
    };
    const spawn = vi.fn(() => {
        const child = makeChild();
        spawned.push(child);
        return child;
    });

    const reset = () => {
        ipcHandlers.clear();
        ipcListeners.clear();
        appListeners.clear();
        windows.length = 0;
        forked.length = 0;
        spawned.length = 0;
        state.ready = undefined;
        state.menuTemplate = undefined;
        state.lastWindowOptions = undefined;

        for (const mock of [
            webContents.send,
            browserWindow.once,
            browserWindow.show,
            browserWindow.loadURL,
            browserWindow.loadFile,
            browserWindow.isDestroyed,
            BrowserWindow,
            BrowserWindow.getAllWindows,
            projects.open,
            projects.openPath,
            projects.create,
            projects.checkDestination,
            projects.chooseDirectory,
            projects.listRecent,
            projects.reload,
            documents.read,
            documents.write,
            documents.writeEntityFields,
            documents.delete,
            documents.renameFile,
            recovery.save,
            recovery.read,
            recovery.clear,
            watch,
            readEngineInfo,
            detectPackageManager,
            syncThemeMenuChecks,
            createThemeMenu,
            ErrorLog,
            errorLog.initialize,
            errorLog.write,
            studioUpdater.getState,
            studioUpdater.checkForUpdates,
            studioUpdater.openDownload,
            shell.openExternal,
            shell.openPath,
            showOpenDialog,
            app.whenReady,
            app.getPath,
            app.on,
            app.quit,
            menu.getMenuItemById,
            Menu.buildFromTemplate,
            Menu.setApplicationMenu,
            Menu.getApplicationMenu,
            utilityProcess.fork,
            spawn,
        ]) {
            mock.mockClear();
        }

        browserWindow.once.mockImplementation(
            (_event: string, listener: Listener) => listener()
        );
        browserWindow.isDestroyed.mockReturnValue(false);
        BrowserWindow.mockImplementation(function (options: unknown) {
            windows.push(browserWindow);
            state.lastWindowOptions = options;
            return browserWindow;
        });
        BrowserWindow.getAllWindows.mockImplementation(() => windows);
        projects.listRecent.mockResolvedValue([]);
        projects.open.mockResolvedValue(null);
        projects.openPath.mockResolvedValue(null);
        projects.create.mockResolvedValue(null);
        projects.checkDestination.mockResolvedValue({ available: true });
        projects.chooseDirectory.mockResolvedValue(null);
        projects.reload.mockResolvedValue(null);
        watch.mockResolvedValue(undefined);
        readEngineInfo.mockResolvedValue({ depsInstalled: true });
        detectPackageManager.mockResolvedValue('yarn');
        shell.openPath.mockResolvedValue('');
        showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
        createThemeMenu.mockReturnValue({ label: 'Themes' });
        errorLog.initialize.mockResolvedValue(undefined);
        errorLog.write.mockResolvedValue(undefined);
        studioUpdater.getState.mockReturnValue({
            status: 'idle',
            currentVersion: '0.2.0',
        });
        studioUpdater.checkForUpdates.mockResolvedValue(undefined);
        studioUpdater.openDownload.mockResolvedValue(undefined);
        app.whenReady.mockImplementation(() => ({
            then: (listener: Listener) => {
                state.ready = listener;
            },
        }));
        app.getPath.mockReturnValue('C:/studio-data');
        app.isPackaged = true;
        app.on.mockImplementation((event: string, listener: Listener) => {
            appListeners.set(event, listener);
        });
        Menu.buildFromTemplate.mockImplementation((template: any[]) => {
            state.menuTemplate = template;
            return menu;
        });
        Menu.getApplicationMenu.mockReturnValue(menu);
        utilityProcess.fork.mockImplementation(() => {
            const proc = makeProcess();
            forked.push(proc);
            return proc;
        });
        spawn.mockImplementation(() => {
            const child = makeChild();
            spawned.push(child);
            return child as any;
        });
    };

    return {
        ipcHandlers,
        ipcListeners,
        appListeners,
        windows,
        forked,
        spawned,
        webContents,
        browserWindow,
        BrowserWindow,
        projects,
        documents,
        recovery,
        watch,
        readEngineInfo,
        detectPackageManager,
        syncThemeMenuChecks,
        createThemeMenu,
        ErrorLog,
        errorLog,
        studioUpdater,
        shell,
        showOpenDialog,
        app,
        Menu,
        utilityProcess,
        spawn,
        reset,
        ready: undefined as Listener | undefined,
        menuTemplate: undefined as any[] | undefined,
        lastWindowOptions: undefined as unknown,
        updaterOnState: undefined as Listener | undefined,
    };
});

vi.mock('electron', () => ({
    app: state.app,
    BrowserWindow: state.BrowserWindow,
    ipcMain: {
        handle: vi.fn((channel: string, listener: Listener) =>
            state.ipcHandlers.set(channel, listener)
        ),
        on: vi.fn((channel: string, listener: Listener) =>
            state.ipcListeners.set(channel, listener)
        ),
    },
    Menu: state.Menu,
    dialog: { showOpenDialog: state.showOpenDialog },
    shell: state.shell,
    utilityProcess: state.utilityProcess,
}));
vi.mock('child_process', () => ({ spawn: state.spawn }));
vi.mock('../project-service', () => ({
    ProjectService: vi.fn(function () {
        return state.projects;
    }),
}));
vi.mock('../document-service', () => ({
    DocumentService: vi.fn(function (markSelfWrite: Listener) {
        state.documents.write.mockImplementation(
            (_dir: string, path: string) => {
                markSelfWrite(path);
                return Promise.resolve('written');
            }
        );
        return state.documents;
    }),
}));
vi.mock('../recovery-service', () => ({
    RecoveryService: vi.fn(function () {
        return state.recovery;
    }),
}));
vi.mock('../watch-service', () => ({
    WatchService: vi.fn(function () {
        return { watch: state.watch };
    }),
}));
vi.mock('../engine-info', () => ({ readEngineInfo: state.readEngineInfo }));
vi.mock('../package-manager', () => ({
    detectPackageManager: state.detectPackageManager,
}));
vi.mock('../theme-menu', () => ({
    createThemeMenu: state.createThemeMenu,
    syncThemeMenuChecks: state.syncThemeMenuChecks,
}));
vi.mock('../error-log', () => ({ ErrorLog: state.ErrorLog }));
vi.mock('../studio-updater', () => ({
    StudioUpdater: vi.fn(function (options: any) {
        state.updaterOnState = options.onState;
        return state.studioUpdater;
    }),
}));

async function boot(): Promise<void> {
    await import('../index');
    state.ready?.();
    await vi.waitFor(() =>
        expect(state.Menu.setApplicationMenu).toHaveBeenCalled()
    );
}

describe('Studio main process', () => {
    beforeEach(() => {
        vi.resetModules();
        state.reset();
        Reflect.deleteProperty(process.env, 'ELECTRON_RENDERER_URL');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('wires windows, menus, projects, documents, recovery, and lifecycle events', async () => {
        const project = {
            projectDir: 'C:/games/story',
            name: 'Story',
            version: '1.0.0',
            files: {},
            problems: [],
            engine: null,
        };
        state.projects.listRecent.mockResolvedValue([
            { name: 'Story', path: 'C:/games/story' },
        ]);
        state.projects.openPath.mockResolvedValue(project);
        state.projects.open.mockResolvedValue(project);
        state.projects.create.mockResolvedValue(project);
        state.projects.chooseDirectory.mockResolvedValue('C:/games');
        state.projects.reload.mockResolvedValue(project);
        state.documents.read.mockResolvedValue('content');
        state.documents.writeEntityFields.mockResolvedValue('entity');
        state.documents.delete.mockResolvedValue(undefined);
        state.documents.renameFile.mockResolvedValue(undefined);
        state.recovery.save.mockResolvedValue(undefined);
        state.recovery.read.mockResolvedValue('draft');
        state.recovery.clear.mockResolvedValue(undefined);

        await boot();

        expect(state.BrowserWindow).toHaveBeenCalledWith(
            expect.objectContaining({
                width: 1440,
                webPreferences: expect.objectContaining({
                    contextIsolation: true,
                    nodeIntegration: false,
                }),
            })
        );
        expect(state.browserWindow.show).toHaveBeenCalled();
        expect(state.browserWindow.loadFile).toHaveBeenCalledWith(
            expect.stringContaining('renderer')
        );

        const fileMenu = state.menuTemplate?.find(
            (item) => item.label === 'File'
        );
        fileMenu.submenu[0].click();
        fileMenu.submenu[1].click();
        fileMenu.submenu[2].submenu[0].click();
        expect(state.webContents.send).toHaveBeenCalledWith('menu:new');
        expect(state.webContents.send).toHaveBeenCalledWith('menu:open');
        expect(state.webContents.send).toHaveBeenCalledWith(
            'menu:openRecent',
            'C:/games/story'
        );
        const helpMenu = state.menuTemplate?.find(
            (item) => item.label === 'Help'
        );
        helpMenu.submenu[0].click();
        expect(state.shell.openExternal).toHaveBeenCalledWith(
            'https://doodleengine.dev/studio/'
        );
        await state.ipcHandlers.get('help:documentation')?.({});
        expect(state.shell.openExternal).toHaveBeenCalledTimes(2);
        helpMenu.submenu[1].click();
        expect(state.shell.openExternal).toHaveBeenCalledWith(
            'https://doodleengine.dev/reference/reporting-issues/'
        );
        helpMenu.submenu[2].click();
        await vi.waitFor(() =>
            expect(state.shell.openPath).toHaveBeenCalledWith(
                'C:/studio-data/doodle-studio.log'
            )
        );
        helpMenu.submenu[4].click();
        expect(state.studioUpdater.checkForUpdates).toHaveBeenCalledWith(true);
        helpMenu.submenu[5].click();
        expect(state.webContents.send).toHaveBeenCalledWith(
            'menu:about',
            '0.2.0'
        );

        await expect(
            state.ipcHandlers.get('project:openPath')?.({}, 'C:/games/story')
        ).resolves.toBe(project);
        await state.ipcHandlers.get('project:open')?.({});
        await state.ipcHandlers.get('project:create')?.({}, { name: 'Story' });
        await expect(
            state.ipcHandlers.get('project:checkDestination')?.(
                {},
                'C:/games',
                'Story'
            )
        ).resolves.toEqual({ available: true });
        await expect(
            state.ipcHandlers.get('project:chooseDir')?.({})
        ).resolves.toBe('C:/games');
        await state.ipcHandlers.get('project:listRecent')?.({});
        await state.ipcHandlers.get('project:revalidate')?.(
            {},
            'C:/games/story'
        );
        expect(state.watch).toHaveBeenCalledTimes(3);

        const [, onChange, isSelfWrite] = state.watch.mock.calls.at(-1)!;
        onChange('content/game.yaml');
        expect(state.webContents.send).toHaveBeenCalledWith(
            'file:changed',
            'content/game.yaml'
        );
        await state.ipcHandlers.get('doc:write')?.(
            {},
            'C:/games/story',
            'C:/games/story/content/game.yaml',
            'text',
            10
        );
        expect(isSelfWrite('C:/games/story/content/game.yaml')).toBe(true);

        await expect(
            state.ipcHandlers.get('doc:read')?.({}, 'dir', 'file')
        ).resolves.toBe('content');
        await expect(
            state.ipcHandlers.get('doc:writeEntity')?.(
                {},
                'dir',
                'file',
                [{ path: ['name'], value: 'New' }],
                12
            )
        ).resolves.toBe('entity');
        await state.ipcHandlers.get('doc:delete')?.({}, 'dir', 'file');
        await state.ipcHandlers.get('doc:rename')?.(
            {},
            'dir',
            'old.yaml',
            'new.yaml'
        );
        await expect(
            state.ipcHandlers.get('asset:import')?.(
                {},
                'C:/games/story',
                'portrait'
            )
        ).resolves.toBeNull();
        expect(state.showOpenDialog).toHaveBeenCalledWith(
            expect.objectContaining({ properties: ['openFile'] })
        );
        await state.ipcHandlers.get('recovery:save')?.(
            {},
            'dir',
            'file',
            'draft'
        );
        await expect(
            state.ipcHandlers.get('recovery:read')?.({}, 'dir', 'file')
        ).resolves.toBe('draft');
        await state.ipcHandlers.get('recovery:clear')?.({}, 'dir', 'file');

        state.ipcListeners.get('theme:menuState')?.(
            {},
            { mode: 'light', color: 'red' }
        );
        expect(state.syncThemeMenuChecks).toHaveBeenCalledWith(
            { mode: 'light', color: 'red' },
            expect.any(Function)
        );

        await state.ipcHandlers.get('shell:openPath')?.(
            {},
            'C:/games/story/dist'
        );
        expect(state.shell.openPath).toHaveBeenCalledWith(
            'C:/games/story/dist'
        );

        state.windows.length = 0;
        state.appListeners.get('activate')?.();
        expect(state.BrowserWindow).toHaveBeenCalledTimes(2);
        state.appListeners.get('window-all-closed')?.();
        expect(state.app.quit).toHaveBeenCalled();
        state.appListeners.get('before-quit')?.();
    });

    it('wires the self-update check to IPC, the renderer, and startup', async () => {
        state.studioUpdater.getState.mockReturnValue({
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: null,
            platform: 'windows',
        });
        await boot();

        expect(state.studioUpdater.checkForUpdates).toHaveBeenCalledWith(false);

        await expect(
            state.ipcHandlers.get('update:getState')?.({})
        ).resolves.toMatchObject({
            status: 'available',
            version: '0.3.0',
        });
        await state.ipcHandlers.get('update:check')?.({});
        expect(state.studioUpdater.checkForUpdates).toHaveBeenCalledWith(true);
        await state.ipcHandlers.get('update:openDownload')?.({});
        expect(state.studioUpdater.openDownload).toHaveBeenCalled();

        const nextState = {
            status: 'downloading',
            currentVersion: '0.2.0',
        };
        state.updaterOnState?.(nextState);
        expect(state.webContents.send).toHaveBeenCalledWith(
            'update:state',
            nextState
        );
    });

    it('skips the automatic startup update check for a development build', async () => {
        state.app.isPackaged = false;
        await boot();
        expect(state.studioUpdater.checkForUpdates).not.toHaveBeenCalled();
    });

    it('logs rejected handlers and renderer errors', async () => {
        await boot();
        const failure = new Error('folder already exists');
        state.projects.create.mockRejectedValueOnce(failure);

        await expect(
            state.ipcHandlers.get('project:create')?.({}, { name: 'Story' })
        ).rejects.toBe(failure);
        expect(state.errorLog.write).toHaveBeenCalledWith(
            'project:create',
            failure
        );

        state.ipcListeners.get('log:error')?.(
            {},
            { context: 'renderer:error', message: 'render failed' }
        );
        await vi.waitFor(() =>
            expect(state.errorLog.write).toHaveBeenCalledWith(
                'renderer:error',
                'render failed'
            )
        );
    });

    it('handles successful, failed, missing-dependency, and cancelled builds', async () => {
        await boot();
        const build = state.ipcHandlers.get('project:build')!;

        state.readEngineInfo.mockResolvedValueOnce({ depsInstalled: false });
        await expect(build({}, 'C:/games/story')).resolves.toEqual(
            expect.objectContaining({ ok: false, durationMs: 0 })
        );
        expect(state.webContents.send).toHaveBeenCalledWith(
            'build:log',
            'C:/games/story',
            expect.stringContaining("aren't installed")
        );

        const completed = build({}, 'C:/games/story');
        await vi.waitFor(() => expect(state.forked).toHaveLength(1));
        const completedProc = state.forked.at(-1);
        completedProc.emit('message', { type: 'log', line: 'building' });
        completedProc.emit('message', {
            type: 'done',
            result: {
                ok: true,
                durationMs: 25,
                errors: [],
                outDir: 'dist',
                outputFiles: ['index.html'],
            },
        });
        await expect(completed).resolves.toEqual(
            expect.objectContaining({
                ok: true,
                cancelled: false,
                logs: ['building'],
            })
        );
        expect(completedProc.postMessage).toHaveBeenCalledWith({
            projectDir: 'C:/games/story',
        });

        const failed = build({}, 'C:/games/story');
        await vi.waitFor(() => expect(state.forked).toHaveLength(2));
        const failedProc = state.forked.at(-1);
        failedProc.emit('message', { type: 'error', message: 'Vite failed' });
        await expect(failed).resolves.toEqual(
            expect.objectContaining({ ok: false, logs: ['Vite failed'] })
        );

        const cancelled = build({}, 'C:/games/story');
        await vi.waitFor(() => expect(state.forked).toHaveLength(3));
        const cancelledProc = state.forked.at(-1);
        state.ipcHandlers.get('project:cancelBuild')?.({});
        expect(cancelledProc.kill).toHaveBeenCalled();
        cancelledProc.emit('exit');
        await expect(cancelled).resolves.toEqual(
            expect.objectContaining({ cancelled: true })
        );
    });

    it('runs local builds and previews against the monorepo engine sources', async () => {
        state.app.isPackaged = false;
        await boot();

        const build = state.ipcHandlers.get('project:build')?.(
            {},
            'C:/games/story'
        );
        await vi.waitFor(() => expect(state.forked).toHaveLength(1));
        const buildProc = state.forked.at(-1);
        expect(buildProc.postMessage).toHaveBeenCalledWith({
            projectDir: 'C:/games/story',
            engineSourceRoot: expect.stringMatching(/doodle-engine$/),
        });
        buildProc.emit('message', { type: 'error', message: 'finished test' });
        await build;

        const preview = state.ipcHandlers.get('preview:start')?.(
            {},
            'C:/games/story'
        );
        const previewProc = state.forked.at(-1);
        expect(previewProc.postMessage).toHaveBeenCalledWith({
            type: 'start',
            projectDir: 'C:/games/story',
            engineSourceRoot: expect.stringMatching(/doodle-engine$/),
        });
        previewProc.emit('message', {
            type: 'error',
            message: 'finished test',
        });
        await preview;
    });

    it('installs dependencies and manages preview processes', async () => {
        vi.useFakeTimers();
        await boot();

        await expect(
            state.ipcHandlers.get('project:packageManager')?.(
                {},
                'C:/games/story'
            )
        ).resolves.toBe('yarn');

        const install = state.ipcHandlers.get('project:installDeps')?.(
            {},
            'C:/games/story'
        );
        await vi.waitFor(() => expect(state.spawned).toHaveLength(1));
        const child = state.spawned[0];
        child.emitStdout('resolved packages\n');
        child.emitStderr('warning\n');
        child.emit('close', 0);
        await expect(install).resolves.toEqual({
            ok: true,
            packageManager: 'yarn',
        });

        const failedInstall = state.ipcHandlers.get('project:installDeps')?.(
            {},
            'C:/games/story'
        );
        await vi.waitFor(() => expect(state.spawned).toHaveLength(2));
        state.spawned[1].emit('error', new Error('not found'));
        await expect(failedInstall).resolves.toEqual({
            ok: false,
            packageManager: 'yarn',
        });

        const start = state.ipcHandlers.get('preview:start')?.(
            {},
            'C:/games/story'
        );
        const preview = state.forked.at(-1);
        preview.emit('message', { type: 'log', line: 'starting' });
        preview.emit('message', {
            type: 'ready',
            url: 'http://localhost:4173/',
        });
        await expect(start).resolves.toEqual({
            url: 'http://localhost:4173/',
            port: 4173,
        });
        expect(state.shell.openExternal).toHaveBeenCalledWith(
            'http://localhost:4173/'
        );

        await expect(
            state.ipcHandlers.get('preview:start')?.({}, 'C:/games/story')
        ).resolves.toEqual({
            url: 'http://localhost:4173/',
            port: 4173,
        });
        state.ipcHandlers.get('preview:open')?.({});
        state.ipcHandlers.get('preview:stop')?.({});
        expect(preview.postMessage).toHaveBeenCalledWith({ type: 'stop' });
        vi.advanceTimersByTime(1500);
        expect(preview.kill).toHaveBeenCalled();
        preview.emit('exit');

        const failedStart = state.ipcHandlers.get('preview:start')?.(
            {},
            'C:/games/story'
        );
        const failedPreview = state.forked.at(-1);
        failedPreview.emit('message', {
            type: 'error',
            message: 'port unavailable',
        });
        await expect(failedStart).resolves.toBeNull();
        failedPreview.emit('exit');

        const stopped = state.ipcHandlers.get('preview:start')?.(
            {},
            'C:/games/story'
        );
        const stoppedPreview = state.forked.at(-1);
        stoppedPreview.emit('message', { type: 'stopped' });
        stoppedPreview.emit('exit');
        await expect(stopped).resolves.toBeNull();
    });
});
