import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioApi } from '../../shared/project';

const exposeInMainWorld = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn(async () => 'result'));
const send = vi.hoisted(() => vi.fn());
const on = vi.hoisted(() => vi.fn());
const removeListener = vi.hoisted(() => vi.fn());
const setZoomFactor = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({
    contextBridge: { exposeInMainWorld },
    ipcRenderer: { invoke, send, on, removeListener },
    webFrame: { setZoomFactor },
}));

let api: StudioApi;
let listeners: Record<string, (...args: any[]) => void>;

beforeAll(async () => {
    await import('../index');
    api = exposeInMainWorld.mock.calls[0][1];
});

beforeEach(() => {
    listeners = {};
    invoke.mockClear();
    send.mockClear();
    on.mockReset().mockImplementation(
        (channel: string, listener: (...args: any[]) => void) => {
            listeners[channel] = listener;
        }
    );
    removeListener.mockClear();
    setZoomFactor.mockClear();
});

describe('preload bridge', () => {
    it('exposes the Studio API in the isolated renderer world', () => {
        expect(exposeInMainWorld).toHaveBeenCalledWith('studio', api);
    });

    it('maps project, document, recovery, process, preview, and shell calls to IPC', async () => {
        const calls: Array<[() => unknown, string, unknown[]]> = [
            [() => api.openProject(), 'project:open', []],
            [() => api.openProjectPath('dir'), 'project:openPath', ['dir']],
            [
                () =>
                    api.createProject({
                        name: 'story',
                        title: 'Story',
                        subtitle: 'A subtitle',
                        targetDir: 'games',
                        useDefaultRenderer: true,
                        useStarterStyles: false,
                        localizationMode: 'literal',
                    }),
                'project:create',
                [
                    {
                        name: 'story',
                        title: 'Story',
                        subtitle: 'A subtitle',
                        targetDir: 'games',
                        useDefaultRenderer: true,
                        useStarterStyles: false,
                        localizationMode: 'literal',
                    },
                ],
            ],
            [() => api.chooseDirectory(), 'project:chooseDir', []],
            [
                () => api.checkProjectDestination('games', 'story'),
                'project:checkDestination',
                ['games', 'story'],
            ],
            [() => api.listRecentProjects(), 'project:listRecent', []],
            [
                () => api.removeRecentProject('dir'),
                'project:removeRecent',
                ['dir'],
            ],
            [() => api.revalidate('dir'), 'project:revalidate', ['dir']],
            [
                () => api.readDocument('dir', 'file'),
                'doc:read',
                ['dir', 'file'],
            ],
            [
                () => api.writeDocument('dir', 'file', 'text', 4),
                'doc:write',
                ['dir', 'file', 'text', 4],
            ],
            [
                () => api.writeEntity('dir', 'file', [], 4),
                'doc:writeEntity',
                ['dir', 'file', [], 4],
            ],
            [
                () => api.deleteDocument('dir', 'file'),
                'doc:delete',
                ['dir', 'file'],
            ],
            [
                () => api.renameDocument('dir', 'from', 'to'),
                'doc:rename',
                ['dir', 'from', 'to'],
            ],
            [
                () => api.importAsset('dir', 'portrait'),
                'asset:import',
                ['dir', 'portrait'],
            ],
            [
                () => api.readAssetDataUrl('dir', 'map', 'world.png'),
                'asset:readDataUrl',
                ['dir', 'map', 'world.png'],
            ],
            [
                () => api.saveRecovery('dir', 'file', 'text'),
                'recovery:save',
                ['dir', 'file', 'text'],
            ],
            [
                () => api.readRecovery('dir', 'file'),
                'recovery:read',
                ['dir', 'file'],
            ],
            [
                () => api.clearRecovery('dir', 'file'),
                'recovery:clear',
                ['dir', 'file'],
            ],
            [() => api.build('dir'), 'project:build', ['dir']],
            [() => api.cancelBuild(), 'project:cancelBuild', []],
            [
                () => api.detectPackageManager('dir'),
                'project:packageManager',
                ['dir'],
            ],
            [
                () => api.installDependencies('dir'),
                'project:installDeps',
                ['dir'],
            ],
            [() => api.startPreview('dir'), 'preview:start', ['dir']],
            [() => api.openPreview(), 'preview:open', []],
            [() => api.stopPreview(), 'preview:stop', []],
            [() => api.openPath('target'), 'shell:openPath', ['target']],
            [() => api.openDocumentation(), 'help:documentation', []],
        ];

        for (const [call, channel, args] of calls) {
            await call();
            expect(invoke).toHaveBeenLastCalledWith(channel, ...args);
        }
        expect(invoke).toHaveBeenCalledTimes(calls.length);
    });

    it('forwards streamed events and removes the exact listeners', () => {
        const buildLog = vi.fn();
        const installLog = vi.fn();
        const previewLog = vi.fn();
        const fileChanged = vi.fn();
        const unsubscribers = [
            api.onBuildLog(buildLog),
            api.onInstallLog(installLog),
            api.onPreviewLog(previewLog),
            api.onFileChanged(fileChanged),
        ];

        listeners['build:log']({}, 'dir', 'built');
        listeners['install:log']({}, 'dir', 'installed');
        listeners['preview:log']({}, 'dir', 'served');
        listeners['file:changed']({}, 'content/game.yaml');
        expect(buildLog).toHaveBeenCalledWith('dir', 'built');
        expect(installLog).toHaveBeenCalledWith('dir', 'installed');
        expect(previewLog).toHaveBeenCalledWith('dir', 'served');
        expect(fileChanged).toHaveBeenCalledWith('content/game.yaml');

        unsubscribers.forEach((unsubscribe) => unsubscribe());
        expect(removeListener).toHaveBeenCalledTimes(4);
        for (const channel of [
            'build:log',
            'install:log',
            'preview:log',
            'file:changed',
        ]) {
            expect(removeListener).toHaveBeenCalledWith(
                channel,
                listeners[channel]
            );
        }
    });

    it('forwards theme state and every native menu action', () => {
        const handlers = {
            onNew: vi.fn(),
            onOpen: vi.fn(),
            onOpenRecent: vi.fn(),
            onAbout: vi.fn(),
            onThemeMode: vi.fn(),
            onThemeColor: vi.fn(),
        };
        api.reportError({ context: 'render', message: 'failed' });
        expect(send).toHaveBeenCalledWith('log:error', {
            context: 'render',
            message: 'failed',
        });
        api.setThemeMenuState({ mode: 'light', color: 'violet' });
        expect(send).toHaveBeenCalledWith('theme:menuState', {
            mode: 'light',
            color: 'violet',
        });
        api.setZoomFactor(1.25);
        expect(setZoomFactor).toHaveBeenCalledWith(1.25);

        const unsubscribe = api.onMenu(handlers);
        listeners['menu:new']();
        listeners['menu:open']();
        listeners['menu:openRecent']({}, 'C:/games/story');
        listeners['menu:about']({}, '0.2.0');
        listeners['menu:themeMode']({}, 'dark');
        listeners['menu:themeColor']({}, 'red');
        expect(handlers.onNew).toHaveBeenCalledOnce();
        expect(handlers.onOpen).toHaveBeenCalledOnce();
        expect(handlers.onOpenRecent).toHaveBeenCalledWith('C:/games/story');
        expect(handlers.onAbout).toHaveBeenCalledWith('0.2.0');
        expect(handlers.onThemeMode).toHaveBeenCalledWith('dark');
        expect(handlers.onThemeColor).toHaveBeenCalledWith('red');

        unsubscribe();
        expect(removeListener).toHaveBeenCalledTimes(6);
    });
});
