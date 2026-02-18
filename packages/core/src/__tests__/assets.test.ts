/**
 * Tests for asset manifest utilities.
 */

import { describe, it, expect } from 'vitest';
import { extractAssetPaths, getAssetType } from '../assets/manifest';
import type { ContentRegistry } from '../types/registry';
import type { GameConfig } from '../types/entities';

// ── getAssetType ──────────────────────────────────────────────────────────────

describe('getAssetType', () => {
    it('identifies image extensions', () => {
        expect(getAssetType('/assets/foo.jpg')).toBe('image');
        expect(getAssetType('/assets/foo.jpeg')).toBe('image');
        expect(getAssetType('/assets/foo.png')).toBe('image');
        expect(getAssetType('/assets/foo.gif')).toBe('image');
        expect(getAssetType('/assets/foo.webp')).toBe('image');
        expect(getAssetType('/assets/foo.svg')).toBe('image');
        expect(getAssetType('/assets/foo.avif')).toBe('image');
    });

    it('identifies video extensions', () => {
        expect(getAssetType('/assets/foo.mp4')).toBe('video');
        expect(getAssetType('/assets/foo.webm')).toBe('video');
        expect(getAssetType('/assets/foo.ogv')).toBe('video');
        expect(getAssetType('/assets/foo.mov')).toBe('video');
    });

    it('identifies audio extensions (default)', () => {
        expect(getAssetType('/assets/foo.ogg')).toBe('audio');
        expect(getAssetType('/assets/foo.mp3')).toBe('audio');
        expect(getAssetType('/assets/foo.wav')).toBe('audio');
        expect(getAssetType('/assets/foo.flac')).toBe('audio');
    });

    it('is case-insensitive', () => {
        expect(getAssetType('/assets/foo.JPG')).toBe('image');
        expect(getAssetType('/assets/foo.OGG')).toBe('audio');
        expect(getAssetType('/assets/foo.MP4')).toBe('video');
    });
});

// ── extractAssetPaths ─────────────────────────────────────────────────────────

function makeRegistry(): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: 'A cozy place',
                banner: '/assets/images/tavern.jpg',
                music: '/assets/audio/tavern.ogg',
                ambient: '/assets/audio/tavern-amb.ogg',
            },
            market: {
                id: 'market',
                name: 'Market',
                description: 'Busy',
                banner: '/assets/images/market.jpg',
                music: '/assets/audio/market.ogg',
                ambient: '',
            },
        },
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Bartender',
                biography: '',
                portrait: '/assets/images/bartender.png',
                location: 'tavern',
                dialogue: 'bartender_greeting',
                stats: {},
            },
        },
        items: {
            coin: {
                id: 'coin',
                name: 'Coin',
                description: '',
                icon: '/assets/images/coin-icon.png',
                image: '/assets/images/coin.png',
                location: 'inventory',
                stats: {},
            },
        },
        maps: {
            town: {
                id: 'town',
                name: 'Town',
                image: '/assets/images/town-map.jpg',
                scale: 1,
                locations: [],
            },
        },
        dialogues: {
            bartender_greeting: {
                id: 'bartender_greeting',
                startNode: 'start',
                nodes: [
                    {
                        id: 'start',
                        speaker: 'bartender',
                        text: 'Hello!',
                        voice: '/assets/audio/hello.ogg',
                        portrait: '/assets/images/bartender-happy.png',
                        choices: [],
                    },
                ],
            },
        },
        quests: {},
        journalEntries: {},
        interludes: {
            chapter_one: {
                id: 'chapter_one',
                background: '/assets/images/chapter-bg.jpg',
                banner: '/assets/images/chapter-banner.png',
                music: '/assets/audio/chapter.ogg',
                voice: '/assets/audio/chapter-voice.ogg',
                sounds: ['/assets/audio/wind.ogg'],
                text: 'Chapter One',
            },
        },
        locales: {},
    };
}

function makeConfig(withShell = false): GameConfig {
    return {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
        ...(withShell
            ? {
                  shell: {
                      splash: {
                          logo: '/assets/images/studio-logo.png',
                          background: '/assets/images/splash-bg.jpg',
                          sound: '/assets/audio/splash.ogg',
                          duration: 2000,
                      },
                      title: {
                          logo: '/assets/images/game-logo.png',
                          background: '/assets/images/title-bg.jpg',
                          music: '/assets/audio/title.ogg',
                      },
                      loading: {
                          background: '/assets/images/loading-bg.jpg',
                      },
                      uiSounds: {
                          click: '/assets/audio/click.ogg',
                          hover: '/assets/audio/hover.ogg',
                          menuOpen: '/assets/audio/menu-open.ogg',
                          menuClose: '/assets/audio/menu-close.ogg',
                      },
                  },
              }
            : {}),
    };
}

describe('extractAssetPaths', () => {
    it('returns empty arrays when registry is empty and no shell config', () => {
        const emptyRegistry: ContentRegistry = {
            locations: {},
            characters: {},
            items: {},
            maps: {},
            dialogues: {},
            quests: {},
            journalEntries: {},
            interludes: {},
            locales: {},
        };
        const config = makeConfig();
        const { shell, game } = extractAssetPaths(emptyRegistry, config);
        expect(shell).toHaveLength(0);
        expect(game).toHaveLength(0);
    });

    it('extracts location assets into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/images/tavern.jpg');
        expect(game).toContain('/assets/audio/tavern.ogg');
        expect(game).toContain('/assets/audio/tavern-amb.ogg');
        expect(game).toContain('/assets/images/market.jpg');
        expect(game).toContain('/assets/audio/market.ogg');
    });

    it('extracts character portraits into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/images/bartender.png');
    });

    it('extracts item assets into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/images/coin-icon.png');
        expect(game).toContain('/assets/images/coin.png');
    });

    it('extracts map images into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/images/town-map.jpg');
    });

    it('extracts dialogue voice and portrait overrides into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/audio/hello.ogg');
        expect(game).toContain('/assets/images/bartender-happy.png');
    });

    it('extracts interlude assets into game tier', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).toContain('/assets/images/chapter-bg.jpg');
        expect(game).toContain('/assets/images/chapter-banner.png');
        expect(game).toContain('/assets/audio/chapter.ogg');
        expect(game).toContain('/assets/audio/chapter-voice.ogg');
        expect(game).toContain('/assets/audio/wind.ogg');
    });

    it('extracts shell assets into shell tier when config.shell is set', () => {
        const { shell } = extractAssetPaths(makeRegistry(), makeConfig(true));
        expect(shell).toContain('/assets/images/studio-logo.png');
        expect(shell).toContain('/assets/images/splash-bg.jpg');
        expect(shell).toContain('/assets/audio/splash.ogg');
        expect(shell).toContain('/assets/images/game-logo.png');
        expect(shell).toContain('/assets/images/title-bg.jpg');
        expect(shell).toContain('/assets/audio/title.ogg');
        expect(shell).toContain('/assets/images/loading-bg.jpg');
        expect(shell).toContain('/assets/audio/click.ogg');
        expect(shell).toContain('/assets/audio/hover.ogg');
        expect(shell).toContain('/assets/audio/menu-open.ogg');
        expect(shell).toContain('/assets/audio/menu-close.ogg');
    });

    it('shell assets are not duplicated in game tier', () => {
        const { shell, game } = extractAssetPaths(
            makeRegistry(),
            makeConfig(true)
        );
        for (const path of shell) {
            expect(game).not.toContain(path);
        }
    });

    it('deduplicates asset paths', () => {
        // Create registry with duplicate paths
        const registry = makeRegistry();
        registry.locations.market2 = {
            id: 'market2',
            name: 'Market 2',
            description: '',
            banner: '/assets/images/tavern.jpg', // same as tavern
            music: '',
            ambient: '',
        };
        const { game } = extractAssetPaths(registry, makeConfig());
        const count = game.filter(
            (p) => p === '/assets/images/tavern.jpg'
        ).length;
        expect(count).toBe(1);
    });

    it('skips empty string asset fields', () => {
        const { game } = extractAssetPaths(makeRegistry(), makeConfig());
        expect(game).not.toContain('');
    });
});
