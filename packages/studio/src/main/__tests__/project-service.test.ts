import { beforeEach, describe, expect, it, vi } from 'vitest';

const showOpenDialog = vi.hoisted(() => vi.fn());
const readFile = vi.hoisted(() => vi.fn());
const readdir = vi.hoisted(() => vi.fn());
const loadProject = vi.hoisted(() => vi.fn());
const validateContent = vi.hoisted(() => vi.fn());
const createProject = vi.hoisted(() => vi.fn());
const addRecentProject = vi.hoisted(() => vi.fn(async () => {}));
const pruneRecentProjects = vi.hoisted(() => vi.fn());
const removeRecentProject = vi.hoisted(() => vi.fn());
const readEngineInfo = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({ dialog: { showOpenDialog } }));
vi.mock('fs/promises', () => ({ readFile, readdir }));
vi.mock('@doodle-engine/toolkit', () => ({
    loadProject,
    validateContent,
    createProject,
}));
vi.mock('../recent-projects', () => ({
    addRecentProject,
    pruneRecentProjects,
    removeRecentProject,
}));
vi.mock('../engine-info', () => ({ readEngineInfo }));

import { ProjectService } from '../project-service';

describe('ProjectService', () => {
    const service = new ProjectService('C:/studio/recent.json', '0.2.1');

    beforeEach(() => {
        showOpenDialog.mockReset().mockResolvedValue({
            canceled: false,
            filePaths: ['C:/games/story'],
        });
        readFile.mockReset().mockResolvedValue(
            JSON.stringify({
                name: 'story-game',
                version: '1.2.3',
                dependencies: { '@doodle-engine/core': '^0.2.0' },
            })
        );
        readdir
            .mockReset()
            .mockRejectedValue(
                Object.assign(new Error('missing'), { code: 'ENOENT' })
            );
        loadProject.mockReset().mockResolvedValue({
            registry: { locations: {} },
            config: { startLocation: 'tavern' },
            fileMap: new Map([['game', 'content/game.yaml']]),
            parseErrors: [{ file: 'bad.dlg', message: 'parse error' }],
        });
        validateContent
            .mockReset()
            .mockReturnValue([{ file: 'game.yaml', message: 'invalid start' }]);
        createProject.mockReset().mockResolvedValue({
            projectPath: 'C:/games/new-story',
        });
        addRecentProject.mockClear();
        pruneRecentProjects.mockReset().mockResolvedValue([
            {
                path: 'C:/games/story',
                name: 'Story',
                openedAt: '2026-01-01T00:00:00.000Z',
            },
        ]);
        readEngineInfo.mockReset().mockResolvedValue({
            declared: 'workspace:*',
            installed: '0.1.3',
            depsInstalled: true,
            packageManager: 'yarn',
        });
    });

    it('chooses a directory and handles both cancellation shapes', async () => {
        await expect(service.chooseDirectory('Pick one')).resolves.toBe(
            'C:/games/story'
        );
        expect(showOpenDialog).toHaveBeenCalledWith({
            title: 'Pick one',
            properties: ['openDirectory', 'createDirectory'],
        });

        showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
        await expect(service.chooseDirectory()).resolves.toBeNull();
        showOpenDialog.mockResolvedValueOnce({
            canceled: false,
            filePaths: [],
        });
        await expect(service.open()).resolves.toBeNull();
    });

    it('loads, validates, describes, and remembers an opened project', async () => {
        const project = await service.open();

        expect(project).toEqual(
            expect.objectContaining({
                projectDir: 'C:/games/story',
                name: 'story-game',
                version: '1.2.3',
                files: { game: 'content/game.yaml' },
                problems: [
                    { file: 'bad.dlg', message: 'parse error' },
                    { file: 'game.yaml', message: 'invalid start' },
                ],
            })
        );
        expect(addRecentProject).toHaveBeenCalledWith(
            'C:/studio/recent.json',
            expect.objectContaining({
                path: 'C:/games/story',
                name: 'story-game',
            })
        );
        expect(readEngineInfo).toHaveBeenCalledWith('C:/games/story', '0.2.1');
    });

    it('falls back to the folder name when package metadata has no name', async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify({
                dependencies: { '@doodle-engine/core': '^0.2.0' },
            })
        );
        const project = await service.reload('C:/games/fallback-name');
        expect(project.name).toBe('fallback-name');
        expect(project.version).toBeNull();
        expect(addRecentProject).not.toHaveBeenCalled();
    });

    it('rejects folders without a Doodle Engine package declaration', async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify({
                name: 'some-other-project',
                dependencies: { react: '^19.0.0' },
            })
        );

        await expect(service.openPath('C:/games/not-doodle')).rejects.toThrow(
            'not a Doodle Engine project'
        );
        expect(loadProject).not.toHaveBeenCalled();
        expect(addRecentProject).not.toHaveBeenCalled();
    });

    it('rejects folders with a missing or malformed package.json', async () => {
        readFile.mockRejectedValueOnce(new Error('missing package'));
        await expect(service.openPath('C:/games/missing')).rejects.toThrow(
            'package.json declares @doodle-engine/core'
        );

        readFile.mockResolvedValueOnce('{ not json');
        await expect(service.openPath('C:/games/malformed')).rejects.toThrow(
            'package.json declares @doodle-engine/core'
        );

        expect(loadProject).not.toHaveBeenCalled();
        expect(addRecentProject).not.toHaveBeenCalled();
    });

    it('accepts an uninstalled project that declares core as a dev dependency', async () => {
        readFile.mockResolvedValueOnce(
            JSON.stringify({
                name: 'uninstalled-story',
                devDependencies: { '@doodle-engine/core': '^0.2.0' },
            })
        );

        await expect(
            service.openPath('C:/games/uninstalled-story')
        ).resolves.toEqual(
            expect.objectContaining({ name: 'uninstalled-story' })
        );
        expect(loadProject).toHaveBeenCalledWith('C:/games/uninstalled-story');
    });

    it('creates through Toolkit and opens the resulting project', async () => {
        const project = await service.create({
            name: 'new-story',
            title: 'New Story',
            subtitle: 'A New Story',
            targetDir: 'C:/games',
            useDefaultRenderer: true,
            useStarterStyles: false,
            contentMode: 'minimal',
            localizationMode: 'localized',
        });

        expect(createProject).toHaveBeenCalledWith('new-story', {
            targetDir: 'C:/games',
            title: 'New Story',
            subtitle: 'A New Story',
            useDefaultRenderer: true,
            useStarterStyles: false,
            contentMode: 'minimal',
            localizationMode: 'localized',
        });
        expect(loadProject).toHaveBeenCalledWith('C:/games/new-story');
        expect(project.projectDir).toBe('C:/games/new-story');
    });

    it('checks whether the destination is missing, empty, occupied, or a file', async () => {
        await expect(
            service.checkDestination('C:/games', 'new-story')
        ).resolves.toEqual({ available: true });

        readdir.mockResolvedValueOnce([]);
        await expect(
            service.checkDestination('C:/games', 'empty')
        ).resolves.toEqual({ available: true });

        readdir.mockResolvedValueOnce(['package.json']);
        await expect(
            service.checkDestination('C:/games', 'occupied')
        ).resolves.toEqual(expect.objectContaining({ available: false }));

        readdir.mockRejectedValueOnce(
            Object.assign(new Error('not a directory'), { code: 'ENOTDIR' })
        );
        await expect(
            service.checkDestination('C:/games', 'existing-file')
        ).resolves.toEqual(expect.objectContaining({ available: false }));

        await expect(
            service.checkDestination('C:/games', 'nested/name')
        ).resolves.toEqual(expect.objectContaining({ available: false }));
    });

    it('returns the stored recent-project list', async () => {
        await expect(service.listRecent()).resolves.toEqual([
            expect.objectContaining({ name: 'Story' }),
        ]);
        expect(pruneRecentProjects).toHaveBeenCalledWith(
            'C:/studio/recent.json'
        );
    });
});
