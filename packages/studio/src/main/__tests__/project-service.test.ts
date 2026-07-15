import { beforeEach, describe, expect, it, vi } from 'vitest';

const showOpenDialog = vi.hoisted(() => vi.fn());
const readFile = vi.hoisted(() => vi.fn());
const loadProject = vi.hoisted(() => vi.fn());
const validateContent = vi.hoisted(() => vi.fn());
const createProject = vi.hoisted(() => vi.fn());
const addRecentProject = vi.hoisted(() => vi.fn(async () => {}));
const readRecentProjects = vi.hoisted(() => vi.fn());
const readEngineInfo = vi.hoisted(() => vi.fn());

vi.mock('electron', () => ({ dialog: { showOpenDialog } }));
vi.mock('fs/promises', () => ({ readFile }));
vi.mock('@doodle-engine/toolkit', () => ({
    loadProject,
    validateContent,
    createProject,
}));
vi.mock('../recent-projects', () => ({
    addRecentProject,
    readRecentProjects,
}));
vi.mock('../engine-info', () => ({ readEngineInfo }));

import { ProjectService } from '../project-service';

describe('ProjectService', () => {
    const service = new ProjectService('C:/studio/recent.json');

    beforeEach(() => {
        showOpenDialog.mockReset().mockResolvedValue({
            canceled: false,
            filePaths: ['C:/games/story'],
        });
        readFile
            .mockReset()
            .mockResolvedValue(
                JSON.stringify({ name: 'story-game', version: '1.2.3' })
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
        readRecentProjects.mockReset().mockResolvedValue([
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
        expect(readEngineInfo).toHaveBeenCalledWith('C:/games/story');
    });

    it('falls back to the folder name when package metadata is unavailable', async () => {
        readFile.mockRejectedValueOnce(new Error('missing package'));
        const project = await service.reload('C:/games/fallback-name');
        expect(project.name).toBe('fallback-name');
        expect(project.version).toBeNull();
        expect(addRecentProject).not.toHaveBeenCalled();
    });

    it('creates through Toolkit and opens the resulting project', async () => {
        const project = await service.create({
            name: 'new-story',
            targetDir: 'C:/games',
            useDefaultRenderer: true,
            useStarterStyles: false,
        });

        expect(createProject).toHaveBeenCalledWith('new-story', {
            targetDir: 'C:/games',
            useDefaultRenderer: true,
            useStarterStyles: false,
        });
        expect(loadProject).toHaveBeenCalledWith('C:/games/new-story');
        expect(project.projectDir).toBe('C:/games/new-story');
    });

    it('returns the stored recent-project list', async () => {
        await expect(service.listRecent()).resolves.toEqual([
            expect.objectContaining({ name: 'Story' }),
        ]);
        expect(readRecentProjects).toHaveBeenCalledWith(
            'C:/studio/recent.json'
        );
    });
});
