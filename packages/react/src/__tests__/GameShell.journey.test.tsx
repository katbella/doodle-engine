// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Engine } from '@doodle-engine/core';
import type {
    AssetManifest,
    ContentRegistry,
    GameConfig,
} from '@doodle-engine/core';
import { GameShell } from '../GameShell';
import { listSaves, saveStorageKeyForProject, writeSave } from '../saves';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const PROJECT_ID = '00000000-0000-4000-8000-000000000003';
const SAVE_KEY = saveStorageKeyForProject(PROJECT_ID);

const manifest: AssetManifest = {
    version: 'test',
    shell: [],
    game: [],
    totalSize: 0,
    shellSize: 0,
};

const config: GameConfig = {
    startLocation: 'tavern',
    startTime: { day: 1, hour: 8 },
    startFlags: {},
    startVariables: {},
    startInventory: ['coin'],
};

function makeRegistry(
    locales: ContentRegistry['locales'] = {}
): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: 'Warm and busy.',
                banner: '',
                music: '',
                ambient: '',
            },
            market: {
                id: 'market',
                name: 'Market',
                description: 'Open stalls.',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Bartender',
                biography: '',
                portrait: '',
                location: 'tavern',
                dialogue: 'greeting',
                stats: {},
            },
        },
        items: {
            coin: {
                id: 'coin',
                name: 'Old Coin',
                description: 'Stamped with a forgotten crest.',
                icon: '',
                image: '',
                location: 'inventory',
                stats: {},
            },
        },
        maps: {
            town: {
                id: 'town',
                name: 'Town',
                image: '',
                scale: 10,
                locations: [
                    { id: 'tavern', x: 0, y: 0 },
                    { id: 'market', x: 20, y: 0 },
                ],
            },
        },
        dialogues: {
            greeting: {
                id: 'greeting',
                startNode: 'start',
                nodes: [
                    {
                        id: 'start',
                        speaker: 'bartender',
                        text: 'What can I get you?',
                        choices: [
                            {
                                id: 'leave',
                                text: 'Nothing today.',
                                next: '',
                            },
                        ],
                    },
                ],
            },
        },
        quests: {},
        journalEntries: {},
        interludes: {},
        locales,
    };
}

async function startGame(registry = makeRegistry()) {
    const user = userEvent.setup();
    render(
        <GameShell
            registry={registry}
            config={config}
            manifest={manifest}
            title="Test Game"
            projectId={PROJECT_ID}
            uiSounds={false}
        />
    );
    await user.click(await screen.findByRole('button', { name: 'Start game' }));
    await user.click(await screen.findByRole('button', { name: 'New Game' }));
    await screen.findByRole('heading', { name: 'Tavern' });
    return user;
}

async function continueFromLoading(
    user: ReturnType<typeof userEvent.setup>
): Promise<void> {
    await user.click(await screen.findByRole('button', { name: 'Start game' }));
}

function renderShell({
    registry = makeRegistry(),
    gameConfig = config,
    availableLocales,
    enableUISounds = false,
}: {
    registry?: ContentRegistry;
    gameConfig?: GameConfig;
    availableLocales?: { code: string; label: string }[];
    enableUISounds?: boolean;
} = {}) {
    render(
        <GameShell
            registry={registry}
            config={gameConfig}
            manifest={manifest}
            title="Test Game"
            projectId={PROJECT_ID}
            uiSounds={enableUISounds ? undefined : false}
            availableLocales={availableLocales}
        />
    );
}

describe('GameShell player journeys', () => {
    it('opens credits from the title screen and returns', async () => {
        const user = userEvent.setup();
        renderShell();
        await continueFromLoading(user);

        await user.click(
            await screen.findByRole('button', { name: 'Credits' })
        );
        expect(screen.getByRole('heading', { name: 'Credits' })).toBeTruthy();
        expect(screen.getByText('Made with Doodle Engine')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('button', { name: 'New Game' })).toBeTruthy();
    });

    it('starts a game and completes a dialogue choice through the composed shell', async () => {
        const user = await startGame();

        await user.click(screen.getByRole('button', { name: 'Bartender' }));
        expect(screen.getByText('What can I get you?')).toBeTruthy();

        await user.click(
            screen.getByRole('button', { name: 'Nothing today.' })
        );
        expect(screen.queryByText('What can I get you?')).toBeNull();
        expect(screen.getByRole('button', { name: 'Bartender' })).toBeTruthy();
    });

    it('loads the newest save through the actual pause-menu path', async () => {
        const registry = makeRegistry();
        const savedEngine = new Engine(registry);
        savedEngine.newGame(config);
        savedEngine.travelTo('market');
        writeSave(localStorage, SAVE_KEY, savedEngine.saveGame(), 'manual', {
            timestamp: '2026-01-01T00:00:00.000Z',
        });

        const user = await startGame(registry);
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(screen.getByRole('button', { name: 'Load' }));

        expect(
            await screen.findByRole('heading', { name: 'Market' })
        ).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Tavern' })).toBeNull();
    });

    it('uses localized strings through the composed renderer, including empty panels', async () => {
        const registry = makeRegistry({
            en: {
                'ui.characters': 'Personajes',
                'ui.journal': 'Diario',
                'ui.no_entries': 'Sin entradas',
                'ui.notes': 'Notas',
                'ui.no_notes': 'Sin notas',
                'ui.close': 'Cerrar',
            },
        });
        const user = await startGame(registry);

        expect(
            screen.getByRole('heading', { name: 'Personajes' })
        ).toBeTruthy();
        expect(screen.queryByText('Characters')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Diario' }));
        expect(screen.getByText('Sin entradas')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Cerrar' }));

        await user.click(screen.getByRole('button', { name: 'Notas' }));
        expect(screen.getByText('Sin notas')).toBeTruthy();
    });

    it('supports the inventory, notes, and map-travel journey through the composed UI', async () => {
        const user = await startGame();

        await user.click(screen.getByRole('button', { name: 'Inventory' }));
        await user.click(screen.getByText('Old Coin'));
        expect(
            screen.getByText('Stamped with a forgotten crest.')
        ).toBeTruthy();
        const itemModal = screen
            .getByText('Stamped with a forgotten crest.')
            .closest<HTMLElement>('.item-modal')!;
        await user.click(
            within(itemModal).getByRole('button', { name: 'Close' })
        );
        await user.click(screen.getByRole('button', { name: 'Close' }));

        await user.click(screen.getByRole('button', { name: 'Notes' }));
        await user.type(screen.getByPlaceholderText('Title'), 'Market clue');
        await user.type(
            screen.getByPlaceholderText('Write a note...'),
            'Ask about the blue stall.'
        );
        await user.click(screen.getByRole('button', { name: 'Add Note' }));
        expect(screen.getByText('Market clue')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Close' }));

        await user.click(screen.getByRole('button', { name: 'Map' }));
        await user.click(screen.getByText('Market'));
        expect(screen.getByText('Travel to Market?')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Travel' }));

        expect(
            await screen.findByRole('heading', { name: 'Market' })
        ).toBeTruthy();
        await waitFor(() =>
            expect(
                listSaves(localStorage, SAVE_KEY).some(
                    (slot) => slot.kind === 'auto'
                )
            ).toBe(true)
        );
    });

    it('changes the title-screen language through settings before starting', async () => {
        const registry = makeRegistry({
            en: {},
            es: {
                'ui.new_game': 'Nueva partida',
                'ui.settings': 'Ajustes',
                'ui.back': 'Volver',
            },
        });
        const user = userEvent.setup();
        renderShell({
            registry,
            availableLocales: [
                { code: 'en', label: 'English' },
                { code: 'es', label: 'Español' },
            ],
        });
        await continueFromLoading(user);

        await user.click(
            await screen.findByRole('button', { name: 'Settings' })
        );
        await user.selectOptions(screen.getByRole('combobox'), 'es');
        await user.click(screen.getByRole('button', { name: 'Volver' }));
        expect(
            screen.getByRole('button', { name: 'Nueva partida' })
        ).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Ajustes' })).toBeTruthy();
    });

    it('continues the newest save directly from the title screen', async () => {
        const registry = makeRegistry();
        const savedEngine = new Engine(registry);
        savedEngine.newGame(config);
        savedEngine.travelTo('market');
        writeSave(localStorage, SAVE_KEY, savedEngine.saveGame(), 'quick', {
            timestamp: '2026-01-02T00:00:00.000Z',
        });
        const user = userEvent.setup();
        renderShell({ registry });
        await continueFromLoading(user);

        await user.click(await screen.findByRole('button', { name: 'Resume' }));
        expect(
            await screen.findByRole('heading', { name: 'Market' })
        ).toBeTruthy();
    });

    it('quick-saves, returns from pause settings, resumes, and quits to title', async () => {
        const user = await startGame();

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(
            listSaves(localStorage, SAVE_KEY).some(
                (slot) => slot.kind === 'quick'
            )
        ).toBe(true);

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        const pauseMenu = screen
            .getByRole('heading', { name: 'Paused' })
            .closest<HTMLElement>('.pause-menu')!;
        await user.click(
            within(pauseMenu).getByRole('button', { name: 'Settings' })
        );
        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Resume' }));
        expect(screen.getByRole('heading', { name: 'Tavern' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(screen.getByRole('button', { name: 'Quit to Title' }));
        expect(
            await screen.findByRole('button', { name: 'New Game' })
        ).toBeTruthy();
    });

    it('moves from the configured splash to the title screen', async () => {
        const user = userEvent.setup();
        renderShell({
            gameConfig: {
                ...config,
                shell: {
                    splash: {
                        logo: 'logo.png',
                        background: 'splash.png',
                        duration: 60_000,
                    },
                },
            },
        });
        await continueFromLoading(user);

        await user.click(
            await screen.findByRole('button', {
                name: 'Skip splash screen',
            })
        );
        expect(
            await screen.findByRole('button', { name: 'New Game' })
        ).toBeTruthy();
    });

    it('uses the completed loading screen as the startup audio gesture', async () => {
        const user = userEvent.setup();
        renderShell({
            gameConfig: {
                ...config,
                shell: {
                    splash: {
                        sound: 'assets/audio/ui/caper sting.mp3',
                        duration: 60_000,
                    },
                },
            },
        });

        expect(
            await screen.findByRole('button', { name: 'Start game' })
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Skip splash screen' })
        ).toBeNull();

        await user.click(screen.getByRole('button', { name: 'Start game' }));
        expect(
            await screen.findByRole('button', { name: 'Skip splash screen' })
        ).toBeTruthy();
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });

    it('plays Studio-imported interface sounds from their full asset paths', async () => {
        const user = userEvent.setup();
        const play = vi.mocked(HTMLMediaElement.prototype.play);
        const originalPlay = play.getMockImplementation();
        const playedSources: string[] = [];
        play.mockImplementation(function (this: HTMLMediaElement) {
            playedSources.push(decodeURI(this.src));
            return Promise.resolve();
        });
        renderShell({
            enableUISounds: true,
            gameConfig: {
                ...config,
                shell: {
                    uiSounds: {
                        hover: 'assets/audio/ui/menu hover.mp3',
                        menuOpen: 'assets/audio/ui/menu open.mp3',
                    },
                },
            },
        });

        await continueFromLoading(user);
        await user.click(
            await screen.findByRole('button', { name: 'Settings' })
        );

        expect(playedSources).toEqual(
            expect.arrayContaining([
                expect.stringContaining('/assets/audio/ui/menu hover.mp3'),
                expect.stringContaining('/assets/audio/ui/menu open.mp3'),
            ])
        );
        expect(playedSources.join(' ')).not.toContain(
            'assets/audio/ui/assets/audio/ui'
        );
        if (originalPlay) play.mockImplementation(originalPlay);
    });

    it('plays the configured click sound for buttons inside the game renderer', async () => {
        const user = userEvent.setup();
        const play = vi.mocked(HTMLMediaElement.prototype.play);
        const originalPlay = play.getMockImplementation();
        const playedSources: string[] = [];
        play.mockImplementation(function (this: HTMLMediaElement) {
            playedSources.push(decodeURI(this.src));
            return Promise.resolve();
        });
        renderShell({
            enableUISounds: true,
            gameConfig: {
                ...config,
                shell: {
                    uiSounds: {
                        click: 'assets/audio/ui/game click.mp3',
                    },
                },
            },
        });

        await continueFromLoading(user);
        await user.click(
            await screen.findByRole('button', { name: 'New Game' })
        );
        playedSources.length = 0;

        await user.click(screen.getByRole('button', { name: 'Inventory' }));

        expect(
            playedSources.filter((source) =>
                source.endsWith('/assets/audio/ui/game click.mp3')
            )
        ).toHaveLength(1);
        if (originalPlay) play.mockImplementation(originalPlay);
    });

    it('plays title music from its full shell asset path after startup', async () => {
        const user = userEvent.setup();
        let playedSrc = '';
        vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(
            function (this: HTMLMediaElement) {
                playedSrc = this.src;
                return Promise.resolve();
            }
        );
        renderShell({
            gameConfig: {
                ...config,
                shell: {
                    title: {
                        music: 'assets/audio/music/caper title.mp3',
                    },
                },
            },
        });

        await continueFromLoading(user);
        expect(
            await screen.findByRole('button', { name: 'New Game' })
        ).toBeTruthy();
        expect(decodeURI(playedSrc)).toContain(
            '/assets/audio/music/caper title.mp3'
        );
    });

    it('shows public resources and opens the in-game audio settings panel', async () => {
        const user = userEvent.setup();
        renderShell({
            gameConfig: {
                ...config,
                startVariables: { gold: 5, _internal: 9 },
            },
        });
        await continueFromLoading(user);
        await user.click(
            await screen.findByRole('button', { name: 'New Game' })
        );

        expect(screen.getByText('gold')).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
        expect(screen.queryByText('_internal')).toBeNull();
        await user.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull();
    });
});
