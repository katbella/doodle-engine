/**
 * Tests for CLI manifest generation and service worker output.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, it, expect } from 'vitest';
import { generateAssetManifest } from '../manifest';
import { generateServiceWorker } from '../service-worker';
import type { AssetManifest, ContentRegistry, GameConfig } from '@doodle-engine/core';

// ── generateServiceWorker ─────────────────────────────────────────────────────

function makeManifest(overrides?: Partial<AssetManifest>): AssetManifest {
    return {
        version: 'test-1',
        shell: [
            {
                path: '/assets/images/logo.png',
                type: 'image',
                size: 1024,
                tier: 1,
            },
            {
                path: '/assets/audio/splash.ogg',
                type: 'audio',
                size: 2048,
                tier: 1,
            },
        ],
        game: [
            {
                path: '/assets/images/tavern.jpg',
                type: 'image',
                size: 40000,
                tier: 2,
            },
            {
                path: '/assets/audio/music.ogg',
                type: 'audio',
                size: 300000,
                tier: 2,
            },
        ],
        shellSize: 3072,
        totalSize: 343072,
        ...overrides,
    };
}

describe('generateServiceWorker', () => {
    it('generates valid JavaScript', () => {
        const manifest = makeManifest();
        const source = generateServiceWorker(manifest);
        expect(typeof source).toBe('string');
        expect(source.length).toBeGreaterThan(0);
    });

    it('includes all asset paths in the precache list', () => {
        const manifest = makeManifest();
        const source = generateServiceWorker(manifest);
        expect(source).toContain('/assets/images/logo.png');
        expect(source).toContain('/assets/audio/splash.ogg');
        expect(source).toContain('/assets/images/tavern.jpg');
        expect(source).toContain('/assets/audio/music.ogg');
    });

    it('includes the cache name with the manifest version', () => {
        const manifest = makeManifest();
        const source = generateServiceWorker(manifest);
        expect(source).toContain('test-1');
    });

    it('includes install, activate, and fetch event listeners', () => {
        const source = generateServiceWorker(makeManifest());
        expect(source).toContain("addEventListener('install'");
        expect(source).toContain("addEventListener('activate'");
        expect(source).toContain("addEventListener('fetch'");
    });

    it('skips /api/ paths in the fetch handler', () => {
        const source = generateServiceWorker(makeManifest());
        expect(source).toContain('/api/');
    });

    it('works with empty manifests', () => {
        const manifest = makeManifest({
            shell: [],
            game: [],
            shellSize: 0,
            totalSize: 0,
        });
        const source = generateServiceWorker(manifest);
        expect(source).toContain('PRECACHE_URLS = []');
    });

    it('generates different cache names for different versions', () => {
        const v1 = generateServiceWorker(makeManifest({ version: 'v1' }));
        const v2 = generateServiceWorker(makeManifest({ version: 'v2' }));
        expect(v1).not.toEqual(v2);
        expect(v1).toContain('v1');
        expect(v2).toContain('v2');
    });
});

// ── generateAssetManifest ────────────────────────────────────────────────────

const tempDirs: string[] = [];

async function makeTempProject() {
    const root = await mkdtemp(join(tmpdir(), 'doodle-manifest-'));
    tempDirs.push(root);
    return root;
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop()!;
        await rm(dir, { recursive: true, force: true });
    }
});

function makeRegistry(): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: '',
                banner: 'tavern.png',
                music: '',
                ambient: '',
            },
        },
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    };
}

function makeConfig(): GameConfig {
    return {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    };
}

describe('generateAssetManifest', () => {
    it('records byte sizes for local referenced assets', async () => {
        const root = await makeTempProject();
        await mkdir(join(root, 'assets', 'images', 'banners'), {
            recursive: true,
        });
        await writeFile(
            join(root, 'assets', 'images', 'banners', 'tavern.png'),
            '12345'
        );

        const manifest = await generateAssetManifest(
            join(root, 'assets'),
            root,
            makeRegistry(),
            makeConfig(),
            'test'
        );

        expect(manifest.game).toContainEqual({
            path: '/assets/images/banners/tavern.png',
            type: 'image',
            size: 5,
            tier: 2,
        });
        expect(manifest.totalSize).toBe(5);
    });

    it('fails when a local referenced asset is missing', async () => {
        const root = await makeTempProject();

        await expect(
            generateAssetManifest(
                join(root, 'assets'),
                root,
                makeRegistry(),
                makeConfig(),
                'test'
            )
        ).rejects.toThrow(
            'Referenced asset not found: /assets/images/banners/tavern.png'
        );
    });
});
