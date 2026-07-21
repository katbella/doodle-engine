/**
 * Preload bridge.
 *
 * Runs with access to Electron APIs but in an isolated context from the page.
 * It exposes a small, explicit API on window.studio; the renderer can call only
 * these methods, never Node or the filesystem directly.
 */

import { contextBridge, ipcRenderer, webFrame } from 'electron';
import type { StudioApi } from '../shared/project';

const api: StudioApi = {
    openProject: () => ipcRenderer.invoke('project:open'),
    openProjectPath: (dir) => ipcRenderer.invoke('project:openPath', dir),
    createProject: (options) => ipcRenderer.invoke('project:create', options),
    checkProjectDestination: (targetDir, name) =>
        ipcRenderer.invoke('project:checkDestination', targetDir, name),
    chooseDirectory: () => ipcRenderer.invoke('project:chooseDir'),
    listRecentProjects: () => ipcRenderer.invoke('project:listRecent'),
    removeRecentProject: (dir) =>
        ipcRenderer.invoke('project:removeRecent', dir),
    revalidate: (dir) => ipcRenderer.invoke('project:revalidate', dir),
    readFlagVarNotes: (dir) =>
        ipcRenderer.invoke('metadata:readFlagVarNotes', dir),
    updateFlagVarNote: (dir, kind, id, note) =>
        ipcRenderer.invoke('metadata:updateFlagVarNote', dir, kind, id, note),
    moveFlagVarNote: (dir, kind, from, to) =>
        ipcRenderer.invoke('metadata:moveFlagVarNote', dir, kind, from, to),
    readDocument: (dir, relPath) =>
        ipcRenderer.invoke('doc:read', dir, relPath),
    writeDocument: (dir, relPath, content, expectedMtimeMs) =>
        ipcRenderer.invoke('doc:write', dir, relPath, content, expectedMtimeMs),
    writeEntity: (dir, relPath, edits, expectedMtimeMs) =>
        ipcRenderer.invoke(
            'doc:writeEntity',
            dir,
            relPath,
            edits,
            expectedMtimeMs
        ),
    deleteDocument: (dir, relPath) =>
        ipcRenderer.invoke('doc:delete', dir, relPath),
    renameDocument: (dir, fromRel, toRel) =>
        ipcRenderer.invoke('doc:rename', dir, fromRel, toRel),
    importAsset: (dir, kind) => ipcRenderer.invoke('asset:import', dir, kind),
    readAssetDataUrl: (dir, kind, value) =>
        ipcRenderer.invoke('asset:readDataUrl', dir, kind, value),
    saveRecovery: (dir, relPath, content) =>
        ipcRenderer.invoke('recovery:save', dir, relPath, content),
    readRecovery: (dir, relPath) =>
        ipcRenderer.invoke('recovery:read', dir, relPath),
    clearRecovery: (dir, relPath) =>
        ipcRenderer.invoke('recovery:clear', dir, relPath),
    build: (dir) => ipcRenderer.invoke('project:build', dir),
    cancelBuild: () => ipcRenderer.invoke('project:cancelBuild'),
    onBuildLog: (callback) => {
        const listener = (_event: unknown, dir: string, line: string) =>
            callback(dir, line);
        ipcRenderer.on('build:log', listener);
        return () => ipcRenderer.removeListener('build:log', listener);
    },
    detectPackageManager: (dir) =>
        ipcRenderer.invoke('project:packageManager', dir),
    installDependencies: (dir) =>
        ipcRenderer.invoke('project:installDeps', dir),
    onInstallLog: (callback) => {
        const listener = (_event: unknown, dir: string, line: string) =>
            callback(dir, line);
        ipcRenderer.on('install:log', listener);
        return () => ipcRenderer.removeListener('install:log', listener);
    },
    startPreview: (dir) => ipcRenderer.invoke('preview:start', dir),
    openPreview: () => ipcRenderer.invoke('preview:open'),
    stopPreview: () => ipcRenderer.invoke('preview:stop'),
    onPreviewLog: (callback) => {
        const listener = (_event: unknown, dir: string, line: string) =>
            callback(dir, line);
        ipcRenderer.on('preview:log', listener);
        return () => ipcRenderer.removeListener('preview:log', listener);
    },
    openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
    openDocumentation: () => ipcRenderer.invoke('help:documentation'),
    reportError: (details) => ipcRenderer.send('log:error', details),
    onFileChanged: (callback) => {
        const listener = (_event: unknown, relPath: string) =>
            callback(relPath);
        ipcRenderer.on('file:changed', listener);
        return () => ipcRenderer.removeListener('file:changed', listener);
    },
    setThemeMenuState: (state) => ipcRenderer.send('theme:menuState', state),
    setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
    onMenu: (handlers) => {
        const onNew = () => handlers.onNew();
        const onOpen = () => handlers.onOpen();
        const onOpenRecent = (_event: unknown, path: string) =>
            handlers.onOpenRecent(path);
        const onAbout = (_event: unknown, version: string) =>
            handlers.onAbout(version);
        const onThemeMode = (
            _event: unknown,
            mode: Parameters<typeof handlers.onThemeMode>[0]
        ) => handlers.onThemeMode(mode);
        const onThemeColor = (
            _event: unknown,
            color: Parameters<typeof handlers.onThemeColor>[0]
        ) => handlers.onThemeColor(color);
        ipcRenderer.on('menu:new', onNew);
        ipcRenderer.on('menu:open', onOpen);
        ipcRenderer.on('menu:openRecent', onOpenRecent);
        ipcRenderer.on('menu:about', onAbout);
        ipcRenderer.on('menu:themeMode', onThemeMode);
        ipcRenderer.on('menu:themeColor', onThemeColor);
        return () => {
            ipcRenderer.removeListener('menu:new', onNew);
            ipcRenderer.removeListener('menu:open', onOpen);
            ipcRenderer.removeListener('menu:openRecent', onOpenRecent);
            ipcRenderer.removeListener('menu:about', onAbout);
            ipcRenderer.removeListener('menu:themeMode', onThemeMode);
            ipcRenderer.removeListener('menu:themeColor', onThemeColor);
        };
    },
};

contextBridge.exposeInMainWorld('studio', api);
