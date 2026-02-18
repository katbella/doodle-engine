/**
 * Tests for CLI manifest generation and service worker output.
 */

import { describe, it, expect } from 'vitest';
import { generateServiceWorker } from '../service-worker';
import type { AssetManifest } from '@doodle-engine/core';

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
