/**
 * Preload bridge.
 *
 * Runs with access to Electron APIs but in an isolated context from the page.
 * It exposes a small, explicit API on window.studio; the renderer can call only
 * these methods, never Node or the filesystem directly.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { StudioApi } from '../shared/project';

const api: StudioApi = {
    openProject: () => ipcRenderer.invoke('project:open'),
    openProjectPath: (dir) => ipcRenderer.invoke('project:openPath', dir),
    createProject: (options) => ipcRenderer.invoke('project:create', options),
    chooseDirectory: () => ipcRenderer.invoke('project:chooseDir'),
    listRecentProjects: () => ipcRenderer.invoke('project:listRecent'),
    revalidate: (dir) => ipcRenderer.invoke('project:revalidate', dir),
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
    saveRecovery: (dir, relPath, content) =>
        ipcRenderer.invoke('recovery:save', dir, relPath, content),
    readRecovery: (dir, relPath) =>
        ipcRenderer.invoke('recovery:read', dir, relPath),
    clearRecovery: (dir, relPath) =>
        ipcRenderer.invoke('recovery:clear', dir, relPath),
    build: (dir) => ipcRenderer.invoke('project:build', dir),
    onFileChanged: (callback) => {
        const listener = (_event: unknown, relPath: string) =>
            callback(relPath);
        ipcRenderer.on('file:changed', listener);
        return () => ipcRenderer.removeListener('file:changed', listener);
    },
    onMenu: (handlers) => {
        const onNew = () => handlers.onNew();
        const onOpen = () => handlers.onOpen();
        const onOpenRecent = (_event: unknown, path: string) =>
            handlers.onOpenRecent(path);
        ipcRenderer.on('menu:new', onNew);
        ipcRenderer.on('menu:open', onOpen);
        ipcRenderer.on('menu:openRecent', onOpenRecent);
        return () => {
            ipcRenderer.removeListener('menu:new', onNew);
            ipcRenderer.removeListener('menu:open', onOpen);
            ipcRenderer.removeListener('menu:openRecent', onOpenRecent);
        };
    },
};

contextBridge.exposeInMainWorld('studio', api);
