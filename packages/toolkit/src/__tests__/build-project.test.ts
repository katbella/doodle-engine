/**
 * Tests for build helpers.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildProject, copyProjectAssets } from '../build-project';

const tempDirs: string[] = [];

async function makeTempDir() {
    const root = await mkdtemp(join(tmpdir(), 'doodle-build-'));
    tempDirs.push(root);
    return root;
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

async function writeProject(files: Record<string, string>): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'doodle-buildgate-'));
    tempDirs.push(root);
    for (const [rel, content] of Object.entries(files)) {
        const full = join(root, rel);
        await mkdir(join(full, '..'), { recursive: true });
        await writeFile(full, content);
    }
    return root;
}

describe('buildProject validation gate', () => {
    it('stops before building when content has validation errors and writes no output', async () => {
        // startLocation points at a location that does not exist: a validation
        // error the same as `doodle build` would report.
        const projectDir = await writeProject({
            'content/game.yaml':
                'startLocation: nowhere\n' +
                'startTime: { day: 1, hour: 8 }\n' +
                'startFlags: {}\n' +
                'startVariables: {}\n' +
                'startInventory: []\n',
            'content/locations/town.yaml':
                'id: town\nname: Town\ndescription: A town.\n',
        });

        const logs: string[] = [];
        const result = await buildProject({
            projectDir,
            onLog: (message) => logs.push(message),
        });

        expect(result.ok).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(
            result.errors.some((e) => e.message.includes('nowhere'))
        ).toBe(true);

        // It validated but never got as far as generating the manifest.
        expect(logs).toContain('Validating content...');
        expect(logs).not.toContain('Generating asset manifest...');

        // No output folder was created.
        await expect(access(join(projectDir, 'dist'))).rejects.toThrow();
    });
});

describe('copyProjectAssets', () => {
    it('copies project assets into the target directory without deleting existing files', async () => {
        const root = await makeTempDir();
        const source = join(root, 'assets');
        const target = join(root, 'dist', 'assets');

        await mkdir(join(source, 'images', 'banners'), { recursive: true });
        await mkdir(target, { recursive: true });
        await writeFile(join(source, 'images', 'banners', 'tavern.png'), 'asset');
        await writeFile(join(target, 'index-generated.js'), 'vite');

        await copyProjectAssets(source, target);

        await expect(
            readFile(join(target, 'images', 'banners', 'tavern.png'), 'utf-8')
        ).resolves.toBe('asset');
        await expect(
            readFile(join(target, 'index-generated.js'), 'utf-8')
        ).resolves.toBe('vite');
    });
});
