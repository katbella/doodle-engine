/**
 * Tests for build helpers.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyProjectAssets } from '../commands/build';

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
