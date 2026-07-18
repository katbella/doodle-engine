import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const showOpenDialog = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ dialog: { showOpenDialog } }));

import { AssetService } from '../asset-service';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(prefix: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), prefix));
    temporaryDirectories.push(directory);
    return directory;
}

beforeEach(() => showOpenDialog.mockReset());

afterEach(async () => {
    while (temporaryDirectories.length > 0) {
        await rm(temporaryDirectories.pop()!, { recursive: true, force: true });
    }
});

describe('AssetService', () => {
    it('chooses and copies content assets into their conventional directory', async () => {
        const project = await temporaryDirectory('doodle-assets-project-');
        const sourceDirectory = await temporaryDirectory(
            'doodle-assets-source-'
        );
        const source = join(sourceDirectory, 'hero.png');
        await writeFile(source, 'portrait');
        showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: [source],
        });
        const onWrite = vi.fn();

        const value = await new AssetService(onWrite).chooseAndImport(
            project,
            'portrait'
        );

        expect(value).toBe('hero.png');
        const target = join(
            project,
            'assets',
            'images',
            'portraits',
            'hero.png'
        );
        expect(await readFile(target, 'utf8')).toBe('portrait');
        expect(onWrite).toHaveBeenCalledWith(target);
        expect(showOpenDialog).toHaveBeenCalledWith(
            expect.objectContaining({
                properties: ['openFile'],
                filters: [expect.objectContaining({ name: 'Images' })],
            })
        );
    });

    it('returns shell paths and keeps an existing file instead of overwriting it', async () => {
        const project = await temporaryDirectory('doodle-assets-project-');
        const sourceDirectory = await temporaryDirectory(
            'doodle-assets-source-'
        );
        const source = join(sourceDirectory, 'title.png');
        await writeFile(source, 'new');
        const destination = join(project, 'assets', 'images', 'ui');
        await mkdir(destination, { recursive: true });
        await writeFile(join(destination, 'title.png'), 'existing');
        const service = new AssetService();

        const value = await service.import(project, source, 'shellImage');

        expect(value).toBe('assets/images/ui/title-2.png');
        expect(await readFile(join(destination, 'title.png'), 'utf8')).toBe(
            'existing'
        );
        expect(await readFile(join(destination, 'title-2.png'), 'utf8')).toBe(
            'new'
        );
    });

    it('returns null when file selection is cancelled', async () => {
        const project = await temporaryDirectory('doodle-assets-project-');
        showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

        await expect(
            new AssetService().chooseAndImport(project, 'voice')
        ).resolves.toBeNull();
    });

    it('reads a contained map image as a data URL and rejects traversal', async () => {
        const project = await temporaryDirectory('doodle-assets-project-');
        const maps = join(project, 'assets', 'images', 'maps');
        await mkdir(maps, { recursive: true });
        await writeFile(join(maps, 'world.png'), 'map-bytes');
        const service = new AssetService();

        await expect(
            service.previewDataUrl(project, 'map', 'world.png')
        ).resolves.toBe(
            `data:image/png;base64,${Buffer.from('map-bytes').toString('base64')}`
        );
        await expect(
            service.previewDataUrl(project, 'map', '../world.png')
        ).resolves.toBeNull();
    });
});
