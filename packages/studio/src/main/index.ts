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
    type MenuItemConstructorOptions,
} from 'electron';
import { join } from 'path';
import { ProjectService } from './project-service';
import { DocumentService } from './document-service';
import { RecoveryService } from './recovery-service';
import { WatchService } from './watch-service';
import type { YamlEdit } from '@doodle-engine/toolkit';
import type {
    NewProjectOptions,
    OpenProject,
    StudioBuildResult,
} from '../shared/project';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 960,
        minHeight: 600,
        backgroundColor: '#0d0e10',
        show: false,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            contextIsolation: true,
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
 * Run a production build and collect its log lines. Errors are returned as a
 * failed result rather than thrown, so a build that fails (for example, a
 * project whose dependencies aren't installed) still gives the user something
 * to read.
 */
/**
 * Build the application menu. File → New/Open plus a live Open Recent submenu.
 * Menu clicks send events to the renderer so opening runs through the same code
 * as the on-screen buttons. Rebuilt after each open so Open Recent stays current.
 */
async function buildMenu(projects: ProjectService): Promise<void> {
    const isMac = process.platform === 'darwin';
    const send = (channel: string, ...args: unknown[]) =>
        mainWindow?.webContents.send(channel, ...args);

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
        { role: 'viewMenu' },
        { role: 'windowMenu' },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function build(projectDir: string): Promise<StudioBuildResult> {
    const logs: string[] = [];
    try {
        const { buildProject } = await import('@doodle-engine/toolkit');
        const result = await buildProject({
            projectDir,
            onLog: (message) => logs.push(message),
        });
        return {
            ok: result.ok,
            durationMs: result.durationMs,
            errors: result.errors,
            logs,
            outDir: result.outDir,
        };
    } catch (error) {
        logs.push(error instanceof Error ? error.message : String(error));
        return { ok: false, durationMs: 0, errors: [], logs, outDir: '' };
    }
}

app.whenReady().then(() => {
    const projects = new ProjectService(
        join(app.getPath('userData'), 'recent-projects.json')
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

    // After any successful open: refresh the recent menu and (re)start watching
    // this project's files, reporting external changes to the renderer.
    const afterOpen = async (project: OpenProject | null) => {
        if (project) {
            await buildMenu(projects);
            await watchService.watch(
                project.projectDir,
                (rel) => mainWindow?.webContents.send('file:changed', rel),
                isSelfWrite
            );
        }
        return project;
    };

    ipcMain.handle('project:open', () => projects.open().then(afterOpen));
    ipcMain.handle('project:openPath', (_event, dir: string) =>
        projects.openPath(dir).then(afterOpen)
    );
    ipcMain.handle('project:create', (_event, options: NewProjectOptions) =>
        projects.create(options).then(afterOpen)
    );
    ipcMain.handle('project:chooseDir', () =>
        projects.chooseDirectory('Choose where to create the project')
    );
    ipcMain.handle('project:listRecent', () => projects.listRecent());
    ipcMain.handle('project:revalidate', (_event, dir: string) =>
        projects.reload(dir)
    );
    ipcMain.handle('project:build', (_event, dir: string) => build(dir));

    const documents = new DocumentService(markSelfWrite);
    ipcMain.handle('doc:read', (_event, dir: string, relPath: string) =>
        documents.read(dir, relPath)
    );
    ipcMain.handle(
        'doc:write',
        (
            _event,
            dir: string,
            relPath: string,
            content: string,
            expectedMtimeMs?: number
        ) => documents.write(dir, relPath, content, expectedMtimeMs)
    );
    ipcMain.handle(
        'doc:writeEntity',
        (
            _event,
            dir: string,
            relPath: string,
            edits: YamlEdit[],
            expectedMtimeMs?: number
        ) => documents.writeEntityFields(dir, relPath, edits, expectedMtimeMs)
    );
    ipcMain.handle('doc:delete', (_event, dir: string, relPath: string) =>
        documents.delete(dir, relPath)
    );
    ipcMain.handle(
        'doc:rename',
        (_event, dir: string, fromRel: string, toRel: string) =>
            documents.renameFile(dir, fromRel, toRel)
    );

    const recovery = new RecoveryService(
        join(app.getPath('userData'), 'recovery')
    );
    ipcMain.handle(
        'recovery:save',
        (_event, dir: string, relPath: string, content: string) =>
            recovery.save(dir, relPath, content)
    );
    ipcMain.handle('recovery:read', (_event, dir: string, relPath: string) =>
        recovery.read(dir, relPath)
    );
    ipcMain.handle('recovery:clear', (_event, dir: string, relPath: string) =>
        recovery.clear(dir, relPath)
    );

    createWindow();
    void buildMenu(projects);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
