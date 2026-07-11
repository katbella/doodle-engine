/**
 * Tests for build helpers.
 */

import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildProject, copyProjectAssets } from '../build-project';
import { createProject } from '../create-project';

const tempDirs: string[] = [];

async function makeTempDir() {
    const root = await mkdtemp(join(tmpdir(), 'doodle-build-'));
    tempDirs.push(root);
    return root;
}

// The scaffolded project must sit inside the monorepo so its build can find
// React and the engine packages in the repo's node_modules.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function makeRepoTempDir() {
    const root = await mkdtemp(join(packageRoot, '.build-test-'));
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

describe('buildProject success', () => {
    it('builds a scaffolded project and writes the runtime files', async () => {
        const targetDir = await makeRepoTempDir();
        const { projectPath } = await createProject('test-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
        });

        const logs: string[] = [];
        const result = await buildProject({
            projectDir: projectPath,
            onLog: (message) => logs.push(message),
        });

        expect(result.ok, result.errors.map((e) => e.message).join('; ')).toBe(
            true
        );
        expect(result.errors).toEqual([]);
        expect(result.durationMs).toBeGreaterThan(0);

        // Every file the build reports it wrote actually exists on disk.
        for (const rel of result.outputFiles) {
            await expect(access(join(result.outDir, rel))).resolves.toBeUndefined();
        }

        // Vite produced the entry HTML.
        await expect(
            access(join(result.outDir, 'index.html'))
        ).resolves.toBeUndefined();

        // api/content is well-formed and carries the loaded registry + config.
        const apiContent = JSON.parse(
            await readFile(join(result.outDir, 'api', 'content'), 'utf-8')
        );
        expect(apiContent.registry).toBeDefined();
        expect(apiContent.config.startLocation).toBeDefined();

        // The asset manifest is well-formed (version + shell/game asset lists).
        const manifest = JSON.parse(
            await readFile(join(result.outDir, 'asset-manifest.json'), 'utf-8')
        );
        expect(manifest.version).toBeDefined();
        expect(Array.isArray(manifest.shell)).toBe(true);
        expect(Array.isArray(manifest.game)).toBe(true);

        expect(logs).toContain('Generating asset manifest...');
    }, 60_000);
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
