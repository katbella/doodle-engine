/**
 * Electron main process for Doodle Studio.
 *
 * Owns the window and the privileged operations. All project work goes through
 * ProjectService, and content loading/validation/build run through
 * @doodle-engine/toolkit — the same code the CLI uses — so the visual app and
 * the command line never disagree. The renderer touches the filesystem only by
 * asking the main process over IPC.
 */

import {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    shell,
    utilityProcess,
    type MenuItemConstructorOptions,
    type IpcMainInvokeEvent,
    type UtilityProcess,
} from 'electron';
import { spawn } from 'child_process';
import { join, resolve as resolvePath } from 'path';
import icon from '../../resources/icon.png?asset';
import { ProjectService } from './project-service';
import { DocumentService } from './document-service';
import { RecoveryService } from './recovery-service';
import { WatchService } from './watch-service';
import { readEngineInfo } from './engine-info';
import { pinDoodlePackages } from './engine-update';
import { detectPackageManager } from './package-manager';
import type { YamlEdit } from '@doodle-engine/toolkit';
import type {
    InstallResult,
    FlagVarNoteKind,
    NewProjectOptions,
    OpenProject,
    PreviewStatus,
    StudioAssetKind,
    StudioBuildResult,
    ThemeState,
} from '../shared/project';
import { createThemeMenu, syncThemeMenuChecks } from './theme-menu';
import { ErrorLog } from './error-log';
import { AssetService } from './asset-service';
import { FlagVarNotesService } from './flag-var-notes-service';
import { StudioUpdater } from './studio-updater';
import { createGithubReleasesLoader } from './studio-release';
import { STUDIO_VERSION } from './version';

const STUDIO_RELEASE_REPO = 'katbella/doodle-engine';

let mainWindow: BrowserWindow | null = null;
let updater: StudioUpdater | null = null;
let themeState: ThemeState = { mode: 'dark', color: 'default' };

// A build and a dev-server preview each run in their own process (they execute
// the project's untrusted Vite config). We hold the current one so it can be
// cancelled, stopped, and cleaned up on quit or when another project opens.
let buildProc: UtilityProcess | null = null;
let previewProc: UtilityProcess | null = null;
let previewStatus: PreviewStatus | null = null;
let errorLog: ErrorLog | null = null;

const STUDIO_DOCUMENTATION_URL = 'https://doodleengine.dev/studio/';
const STUDIO_REPORTING_URL =
    'https://doodleengine.dev/reference/reporting-issues/';

function openDocumentation(): Promise<void> {
    return shell.openExternal(STUDIO_DOCUMENTATION_URL);
}

function developmentEngineRoot(): string | undefined {
    return app.isPackaged ? undefined : resolvePath(__dirname, '../../../..');
}

async function recordError(context: string, error: unknown): Promise<void> {
    try {
        await errorLog?.write(context, error);
    } catch (logError) {
        console.error(logError);
    }
}

// A worker can post a final log line while the window is closing. Sending to a
// destroyed window throws "Object has been destroyed", so drop it if it's gone.
function sendToRenderer(channel: string, ...args: unknown[]): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, ...args);
    }
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        backgroundColor: '#0c0d0f',
        show: false,
        icon,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            devTools: !app.isPackaged,
            nodeIntegration: false,
        },
    });

    mainWindow.once('ready-to-show', () => mainWindow?.show());

    if (process.env.ELECTRON_RENDERER_URL) {
        mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }
}

/**
 * Build the application menu. File owns projects; Themes owns appearance.
 * Menu clicks send events to the renderer so opening runs through the same code
 * as the on-screen buttons. Rebuilt after each open so Open Recent stays current.
 */
async function buildMenu(projects: ProjectService): Promise<void> {
    const isMac = process.platform === 'darwin';
    const send = (channel: string, ...args: unknown[]) =>
        sendToRenderer(channel, ...args);

    const recent = await projects.listRecent();
    const recentSubmenu: MenuItemConstructorOptions[] = recent.length
        ? recent.map((entry) => ({
              label: entry.name,
              click: () => send('menu:openRecent', entry.path),
          }))
        : [{ label: 'No recent projects', enabled: false }];

    const template: MenuItemConstructorOptions[] = [
        ...(isMac ? [{ role: 'appMenu' } as MenuItemConstructorOptions] : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Project…',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => send('menu:new'),
                },
                {
                    label: 'Open Project…',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => send('menu:open'),
                },
                { label: 'Open Recent', submenu: recentSubmenu },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' },
            ],
        },
        { role: 'editMenu' },
        app.isPackaged
            ? {
                  label: 'View',
                  submenu: [
                      { role: 'resetZoom' },
                      { role: 'zoomIn' },
                      { role: 'zoomOut' },
                      { type: 'separator' },
                      { role: 'togglefullscreen' },
                  ],
              }
            : { role: 'viewMenu' },
        {
            label: 'Run',
            submenu: [
                {
                    label: 'Playtest',
                    accelerator: 'F5',
                    click: () => send('menu:playtest'),
                },
                {
                    label: 'Preview',
                    accelerator: 'F6',
                    click: () => send('menu:preview'),
                },
                {
                    label: 'Stop Preview',
                    accelerator: 'Shift+F6',
                    click: () => send('menu:stopPreview'),
                },
                {
                    label: 'Validate',
                    accelerator: 'F7',
                    click: () => send('menu:validate'),
                },
                { type: 'separator' },
                {
                    label: 'Build',
                    accelerator: 'CmdOrCtrl+Shift+B',
                    click: () => send('menu:build'),
                },
            ],
        },
        createThemeMenu(themeState, send),
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => void openDocumentation(),
                },
                {
                    label: 'Report an Issue…',
                    click: () => void shell.openExternal(STUDIO_REPORTING_URL),
                },
                {
                    label: 'Open Error Log',
                    click: () => {
                        const log = errorLog;
                        if (!log) return;
                        void log
                            .initialize()
                            .then(() => shell.openPath(log.path))
                            .catch((error) =>
                                recordError('help:openErrorLog', error)
                            );
                    },
                },
                { type: 'separator' },
                {
                    label: 'Check for Updates…',
                    click: () => void updater?.checkForUpdates(true),
                },
                {
                    label: 'About…',
                    click: () => send('menu:about', STUDIO_VERSION),
                },
            ],
        },
        { role: 'windowMenu' },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Run a production build in a separate process, streaming its log lines to the
 * renderer as they happen and resolving with the final result. Cancelling
 * (project:cancelBuild) kills the process, which resolves this as cancelled.
 * Errors are returned as a failed result rather than thrown, so a build that
 * fails still gives the user something to read.
 */
function runBuild(projectDir: string): Promise<StudioBuildResult> {
    buildProc?.kill();
    const logs: string[] = [];
    const start = Date.now();
    // Lines carry the project folder so the window can ignore lines that
    // belong to a project it is no longer showing.
    const send = (line: string) =>
        sendToRenderer('build:log', projectDir, line);

    return new Promise((resolve) => {
        const proc = utilityProcess.fork(
            join(__dirname, 'build-worker.js'),
            [],
            { cwd: projectDir }
        );
        buildProc = proc;
        let settled = false;
        const finish = (result: StudioBuildResult) => {
            if (settled) return;
            settled = true;
            if (buildProc === proc) buildProc = null;
            resolve(result);
        };

        proc.on('message', (msg: BuildWorkerMessage) => {
            if (msg.type === 'log') {
                logs.push(msg.line);
                send(msg.line);
            } else if (msg.type === 'done') {
                finish({
                    ok: msg.result.ok,
                    cancelled: false,
                    durationMs: msg.result.durationMs,
                    errors: msg.result.errors,
                    logs,
                    outDir: msg.result.outDir,
                    outputFiles: msg.result.outputFiles,
                });
                proc.kill();
            } else if (msg.type === 'error') {
                logs.push(msg.message);
                send(msg.message);
                finish({
                    ok: false,
                    cancelled: false,
                    durationMs: Date.now() - start,
                    errors: [],
                    logs,
                    outDir: '',
                    outputFiles: [],
                });
                proc.kill();
            }
        });

        // If the process exits before a done/error message, it was cancelled
        // (killed) — settle so the awaiting Build button isn't left hanging.
        proc.on('exit', () =>
            finish({
                ok: false,
                cancelled: true,
                durationMs: Date.now() - start,
                errors: [],
                logs,
                outDir: '',
                outputFiles: [],
            })
        );

        const engineSourceRoot = developmentEngineRoot();
        proc.postMessage({
            projectDir,
            ...(engineSourceRoot ? { engineSourceRoot } : {}),
        });
    });
}

/**
 * Install a project's dependencies with its own package manager, streaming the
 * output to the renderer. This is the standalone-user path: a writer who opened
 * a fresh project folder can get it build-ready without a terminal.
 */
async function installDependencies(projectDir: string): Promise<InstallResult> {
    const send = (line: string) =>
        sendToRenderer('install:log', projectDir, line);
    const packageManager = await detectPackageManager(projectDir);
    send(`Installing dependencies with ${packageManager}…`);

    return new Promise((resolve) => {
        const child = spawn(packageManager, ['install'], {
            cwd: projectDir,
            shell: process.platform === 'win32',
        });
        const forward = (chunk: Buffer) => {
            const text = chunk.toString().replace(/\s+$/, '');
            if (text) send(text);
        };
        child.stdout?.on('data', forward);
        child.stderr?.on('data', forward);
        child.on('error', (error) => {
            send(`Could not run ${packageManager}: ${error.message}`);
            resolve({ ok: false, packageManager });
        });
        child.on('close', (code) => {
            send(
                code === 0
                    ? '✓ Dependencies installed.'
                    : `✗ Install failed (exit code ${code}).`
            );
            resolve({ ok: code === 0, packageManager });
        });
    });
}

async function updateEnginePackages(
    projectDir: string,
    version: string
): Promise<InstallResult> {
    const packageManager = await detectPackageManager(projectDir);
    let packages: string[];
    try {
        packages = await pinDoodlePackages(projectDir, version);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : String(error);
        sendToRenderer(
            'install:log',
            projectDir,
            `Could not update Doodle Engine: ${message}`
        );
        return { ok: false, packageManager };
    }
    sendToRenderer(
        'install:log',
        projectDir,
        `Updating ${packages.join(', ')} to ${version}…`
    );
    return installDependencies(projectDir);
}

/**
 * Start the project's dev server in a separate process and open it in the
 * default browser.
 */
function startPreview(projectDir: string): Promise<PreviewStatus | null> {
    if (previewProc) {
        if (previewStatus) shell.openExternal(previewStatus.url);
        return Promise.resolve(previewStatus);
    }
    const send = (line: string) =>
        sendToRenderer('preview:log', projectDir, line);

    return new Promise((resolve) => {
        const proc = utilityProcess.fork(
            join(__dirname, 'preview-worker.js'),
            [],
            { cwd: projectDir }
        );
        previewProc = proc;
        let settled = false;

        proc.on('message', (msg: PreviewWorkerMessage) => {
            if (msg.type === 'ready') {
                let port = 3000;
                try {
                    port = Number(new URL(msg.url).port) || 3000;
                } catch {
                    /* keep default */
                }
                previewStatus = { url: msg.url, port };
                send(`Dev server ready at ${msg.url}`);
                shell.openExternal(msg.url);
                if (!settled) {
                    settled = true;
                    resolve(previewStatus);
                }
            } else if (msg.type === 'log') {
                send(msg.line);
            } else if (msg.type === 'error') {
                send(msg.message);
                proc.kill();
                if (!settled) {
                    settled = true;
                    resolve(null);
                }
            } else if (msg.type === 'stopped') {
                proc.kill();
            }
        });

        proc.on('exit', () => {
            if (previewProc === proc) {
                previewProc = null;
                previewStatus = null;
            }
            send('Dev server stopped.');
            if (!settled) {
                settled = true;
                resolve(null);
            }
        });

        const engineSourceRoot = developmentEngineRoot();
        proc.postMessage({
            type: 'start',
            projectDir,
            ...(engineSourceRoot ? { engineSourceRoot } : {}),
        });
    });
}

/** Stop the running dev-server preview, killing it if it doesn't close cleanly. */
function stopPreview(): void {
    const proc = previewProc;
    if (!proc) return;
    proc.postMessage({ type: 'stop' });
    setTimeout(() => {
        if (previewProc === proc) proc.kill();
    }, 1500);
}

/** The result shape the build worker posts back (the toolkit's BuildResult). */
interface WorkerBuildResult {
    ok: boolean;
    errors: StudioBuildResult['errors'];
    durationMs: number;
    outDir: string;
    outputFiles: string[];
}

type BuildWorkerMessage =
    | { type: 'log'; line: string }
    | { type: 'done'; result: WorkerBuildResult }
    | { type: 'error'; message: string };

type PreviewWorkerMessage =
    | { type: 'ready'; url: string }
    | { type: 'log'; line: string }
    | { type: 'error'; message: string }
    | { type: 'stopped' };

app.whenReady().then(() => {
    errorLog = new ErrorLog(join(app.getPath('logs'), 'doodle-studio.log'));
    void errorLog.initialize().catch((error) => console.error(error));

    updater = new StudioUpdater({
        currentVersion: STUDIO_VERSION,
        platform: process.platform,
        loadReleases: createGithubReleasesLoader(STUDIO_RELEASE_REPO),
        openExternal: (url) => shell.openExternal(url),
        onState: (state) => sendToRenderer('update:state', state),
        onError: (context, error) => void recordError(context, error),
    });

    const handle = <Args extends unknown[], Result>(
        channel: string,
        listener: (
            event: IpcMainInvokeEvent,
            ...args: Args
        ) => Result | Promise<Result>
    ): void => {
        ipcMain.handle(channel, async (event, ...args) => {
            try {
                return await listener(event, ...(args as Args));
            } catch (error) {
                await recordError(channel, error);
                throw error;
            }
        });
    };

    const projects = new ProjectService(
        join(app.getPath('userData'), 'recent-projects.json'),
        STUDIO_VERSION
    );

    // Track Studio's own writes so the watcher can ignore them (an autosave
    // must not echo back to the renderer as an external change).
    const selfWrites = new Map<string, number>();
    const markSelfWrite = (absPath: string) =>
        selfWrites.set(absPath, Date.now());
    const isSelfWrite = (absPath: string) => {
        const at = selfWrites.get(absPath);
        return at !== undefined && Date.now() - at < 1500;
    };
    const watchService = new WatchService();

    ipcMain.on('theme:menuState', (_event, state: ThemeState) => {
        themeState = state;
        const menu = Menu.getApplicationMenu();
        syncThemeMenuChecks(
            state,
            (id) => menu?.getMenuItemById(id) ?? undefined
        );
    });
    ipcMain.on(
        'log:error',
        (
            _event,
            details: { context: string; message: string; stack?: string }
        ) => void recordError(details.context, details.stack ?? details.message)
    );

    // After any successful open: refresh the recent menu and (re)start watching
    // this project's files, reporting external changes to the renderer.
    const afterOpen = async (project: OpenProject | null) => {
        if (project) {
            // A preview and a build point at whichever project started them;
            // opening another (or reopening) leaves them stale, so stop both.
            stopPreview();
            buildProc?.kill();
            await buildMenu(projects);
            await watchService.watch(
                project.projectDir,
                (rel) => sendToRenderer('file:changed', rel),
                isSelfWrite
            );
        }
        return project;
    };

    handle('project:open', () => projects.open().then(afterOpen));
    handle('project:openPath', (_event, dir: string) =>
        projects.openPath(dir).then(afterOpen)
    );
    handle('project:create', (_event, options: NewProjectOptions) =>
        projects.create(options).then(afterOpen)
    );
    handle(
        'project:checkDestination',
        (_event, targetDir: string, name: string) =>
            projects.checkDestination(targetDir, name)
    );
    handle('project:chooseDir', () =>
        projects.chooseDirectory('Choose where to create the project')
    );
    handle('project:listRecent', () => projects.listRecent());
    handle('project:removeRecent', async (_event, dir: string) => {
        const recent = await projects.removeRecent(dir);
        await buildMenu(projects);
        return recent;
    });
    handle('project:revalidate', (_event, dir: string) => projects.reload(dir));
    handle(
        'project:build',
        async (_event, dir: string): Promise<StudioBuildResult> => {
            // Refuse early with a readable message rather than letting Vite fail
            // with a raw module-resolution error when deps aren't installed.
            const info = await readEngineInfo(dir, STUDIO_VERSION);
            if (!info.depsInstalled) {
                const line =
                    "This project's dependencies aren't installed. Install them, then build.";
                sendToRenderer('build:log', dir, line);
                return {
                    ok: false,
                    cancelled: false,
                    durationMs: 0,
                    errors: [],
                    logs: [line],
                    outDir: '',
                    outputFiles: [],
                };
            }
            return runBuild(dir);
        }
    );
    handle('project:cancelBuild', () => {
        buildProc?.kill();
    });
    handle('project:packageManager', (_event, dir: string) =>
        detectPackageManager(dir)
    );
    handle('project:installDeps', (_event, dir: string) =>
        installDependencies(dir)
    );
    handle('project:updateEngine', (_event, dir: string) =>
        updateEnginePackages(dir, STUDIO_VERSION)
    );
    handle('preview:start', (_event, dir: string) => startPreview(dir));
    handle('preview:open', () => {
        if (previewStatus) shell.openExternal(previewStatus.url);
    });
    handle('preview:stop', () => stopPreview());
    handle('shell:openPath', async (_event, targetPath: string) => {
        await shell.openPath(targetPath);
    });
    handle('help:documentation', () => openDocumentation());
    handle('update:getState', () => updater?.getState());
    handle('update:check', () => updater?.checkForUpdates(true));
    handle('update:openDownload', () => updater?.openDownload());

    const documents = new DocumentService(markSelfWrite);
    const assets = new AssetService(markSelfWrite);
    const flagVarNotes = new FlagVarNotesService(documents);
    handle('metadata:readFlagVarNotes', (_event, dir: string) =>
        flagVarNotes.read(dir)
    );
    handle(
        'metadata:updateFlagVarNote',
        (
            _event,
            dir: string,
            kind: FlagVarNoteKind,
            id: string,
            note: string
        ) => flagVarNotes.update(dir, kind, id, note)
    );
    handle(
        'metadata:moveFlagVarNote',
        (
            _event,
            dir: string,
            kind: FlagVarNoteKind,
            from: string,
            to: string
        ) => flagVarNotes.move(dir, kind, from, to)
    );
    handle('doc:read', (_event, dir: string, relPath: string) =>
        documents.read(dir, relPath)
    );
    handle(
        'doc:write',
        (
            _event,
            dir: string,
            relPath: string,
            content: string,
            expectedMtimeMs?: number
        ) => documents.write(dir, relPath, content, expectedMtimeMs)
    );
    handle(
        'doc:writeEntity',
        (
            _event,
            dir: string,
            relPath: string,
            edits: YamlEdit[],
            expectedMtimeMs?: number
        ) => documents.writeEntityFields(dir, relPath, edits, expectedMtimeMs)
    );
    handle('doc:delete', (_event, dir: string, relPath: string) =>
        documents.delete(dir, relPath)
    );
    handle(
        'doc:rename',
        (_event, dir: string, fromRel: string, toRel: string) =>
            documents.renameFile(dir, fromRel, toRel)
    );
    handle('asset:import', (_event, dir: string, kind: StudioAssetKind) =>
        assets.chooseAndImport(dir, kind)
    );
    handle(
        'asset:readDataUrl',
        (_event, dir: string, kind: StudioAssetKind, value: string) =>
            assets.previewDataUrl(dir, kind, value)
    );

    const recovery = new RecoveryService(
        join(app.getPath('userData'), 'recovery')
    );
    handle(
        'recovery:save',
        (_event, dir: string, relPath: string, content: string) =>
            recovery.save(dir, relPath, content)
    );
    handle('recovery:read', (_event, dir: string, relPath: string) =>
        recovery.read(dir, relPath)
    );
    handle('recovery:clear', (_event, dir: string, relPath: string) =>
        recovery.clear(dir, relPath)
    );

    createWindow();
    void buildMenu(projects);

    // Development versions have no corresponding release to check.
    if (app.isPackaged) void updater?.checkForUpdates(false);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Don't leave a build or dev server running after Studio exits.
app.on('before-quit', () => {
    buildProc?.kill();
    previewProc?.kill();
});
