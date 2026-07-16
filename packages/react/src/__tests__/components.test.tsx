import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Engine, type GameState, type Snapshot } from '@doodle-engine/core';
import type { ContentRegistry } from '@doodle-engine/core';
import type { AssetContextValue } from '../AssetProvider';
import { AssetContext } from '../AssetProvider';
import { GameProvider } from '../GameProvider';
import { GameRenderer } from '../GameRenderer';
import { resolveChoiceListInput } from '../components/ChoiceList';
import { Interlude, resolveInterludeInput } from '../components/Interlude';
import { DialogueBox } from '../components/DialogueBox';
import { CharacterList } from '../components/CharacterList';
import { Inventory } from '../components/Inventory';
import { MapView } from '../components/MapView';
import {
    VideoPlayer,
    shouldCompleteVideoFromInput,
} from '../components/VideoPlayer';
import { LocationView } from '../components/LocationView';

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
    return {
        location: {
            id: 'town',
            name: 'Town',
            description: 'A quiet town.',
            banner: '',
        },
        charactersHere: [],
        itemsHere: [],
        choices: [],
        dialogue: null,
        party: [],
        inventory: [],
        quests: [],
        journal: [],
        playerNotes: [],
        variables: {},
        time: { day: 1, hour: 9 },
        map: null,
        music: '',
        ambient: '',
        notifications: [],
        pendingSounds: [],
        pendingVideo: null,
        pendingInterlude: null,
        ui: {
            'ui.continue': 'Continue',
            'ui.end_dialogue': 'End Dialogue',
            'ui.no_companions': 'No companions',
            'ui.inventory': 'Inventory',
            'ui.journal': 'Journal',
            'ui.notes': 'Notes',
            'ui.save_load': 'Save/Load',
            'ui.map': 'Map',
            'ui.settings': 'Settings',
        },
        currentLocale: 'en',
        ...overrides,
    };
}

function makeRegistry(): ContentRegistry {
    return {
        locations: {
            town: {
                id: 'town',
                name: 'Town',
                description: 'A quiet town.',
                banner: '',
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
        locales: { en: {} },
    };
}

function makeState(): GameState {
    return {
        currentLocation: 'town',
        currentTime: { day: 1, hour: 9 },
        flags: {},
        variables: {},
        inventory: [],
        questProgress: {},
        unlockedJournalEntries: [],
        playerNotes: [],
        dialogueState: null,
        characterState: {},
        itemLocations: {},
        mapEnabled: true,
        notifications: [],
        pendingSounds: [],
        musicOverride: null,
        pendingVideo: null,
        pendingInterlude: null,
        currentLocale: 'en',
    };
}

function withAssetContext(children: ReactNode) {
    const value: AssetContextValue = {
        state: {
            phase: 'complete',
            bytesLoaded: 1,
            bytesTotal: 1,
            assetsLoaded: 1,
            assetsTotal: 1,
            progress: 1,
            overallProgress: 1,
            currentAsset: null,
            error: null,
        },
        getAssetUrl: (path) => `/cdn${path}`,
        isReady: () => true,
        prefetch: () => {},
        loader: {
            isAvailable: async () => true,
            load: async () => {},
            loadMany: async () => {},
            getUrl: (path) => `/cdn${path}`,
            prefetch: () => {},
            clear: async () => {},
        },
    };

    return (
        <AssetContext.Provider value={value}>{children}</AssetContext.Provider>
    );
}

describe('React components', () => {
    it('resolves ChoiceList input commands', () => {
        const choices = [
            { id: 'ask', text: 'Ask' },
            { id: 'leave', text: 'Leave' },
        ];

        expect(resolveChoiceListInput([], 'confirm')).toEqual({
            type: 'continue',
        });
        expect(resolveChoiceListInput(choices, 'choice2', 1)).toEqual({
            type: 'selectChoice',
            choiceId: 'leave',
        });
        expect(resolveChoiceListInput(choices, 'confirm')).toBeNull();
        expect(resolveChoiceListInput(choices, 'choice9', 8)).toBeNull();
    });

    it('resolves interlude input commands', () => {
        expect(resolveInterludeInput('confirm')).toBe('dismiss');
        expect(resolveInterludeInput('cancel')).toBe('dismiss');
        expect(resolveInterludeInput('next')).toBe('scrollNext');
        expect(resolveInterludeInput('previous')).toBe('scrollPrevious');
        expect(resolveInterludeInput('choice1')).toBeNull();
    });

    it('resolves video input commands', () => {
        expect(shouldCompleteVideoFromInput('confirm')).toBe(true);
        expect(shouldCompleteVideoFromInput('cancel')).toBe(true);
        expect(shouldCompleteVideoFromInput('continue')).toBe(true);
        expect(shouldCompleteVideoFromInput('choice1')).toBe(false);
    });

    it('uses asset context URLs for stock media components', () => {
        const locationHtml = renderToStaticMarkup(
            withAssetContext(
                <LocationView
                    location={{
                        id: 'town',
                        name: 'Town',
                        description: 'A quiet town.',
                        banner: '/assets/images/town.png',
                    }}
                />
            )
        );
        const videoHtml = renderToStaticMarkup(
            withAssetContext(
                <VideoPlayer
                    src="/assets/video/intro.mp4"
                    onComplete={() => {}}
                />
            )
        );
        const interludeHtml = renderToStaticMarkup(
            withAssetContext(
                <Interlude
                    interlude={{
                        id: 'opening',
                        background: '/assets/images/opening.jpg',
                        banner: '/assets/images/banner.png',
                        text: 'Opening text.',
                        scroll: true,
                        scrollSpeed: 30,
                    }}
                    onDismiss={() => {}}
                />
            )
        );
        const dialogueHtml = renderToStaticMarkup(
            withAssetContext(
                <DialogueBox
                    dialogue={{
                        speaker: 'narrator',
                        speakerName: 'Narrator',
                        text: 'Look there.',
                        portrait: '/assets/images/portraits/narrator.png',
                    }}
                />
            )
        );
        const characterHtml = renderToStaticMarkup(
            withAssetContext(
                <CharacterList
                    characters={[
                        {
                            id: 'sage',
                            name: 'Sage',
                            biography: '',
                            portrait: '/assets/images/portraits/sage.png',
                            location: 'town',
                            inParty: false,
                            relationship: 0,
                            stats: {},
                        },
                    ]}
                    onTalkTo={() => {}}
                />
            )
        );
        const inventoryHtml = renderToStaticMarkup(
            withAssetContext(
                <Inventory
                    items={[
                        {
                            id: 'coin',
                            name: 'Coin',
                            description: 'Old coin.',
                            icon: '/assets/images/items/coin_icon.png',
                            image: '/assets/images/items/coin.png',
                            stats: {},
                        },
                    ]}
                />
            )
        );
        const mapHtml = renderToStaticMarkup(
            withAssetContext(
                <MapView
                    map={{
                        id: 'town',
                        name: 'Town Map',
                        image: '/assets/images/maps/town.png',
                        scale: 1,
                        locations: [],
                    }}
                    onTravelTo={() => {}}
                />
            )
        );

        expect(locationHtml).toContain('/cdn/assets/images/town.png');
        expect(videoHtml).toContain('/cdn/assets/video/intro.mp4');
        expect(interludeHtml).toContain('/cdn/assets/images/opening.jpg');
        expect(interludeHtml).toContain('/cdn/assets/images/banner.png');
        expect(dialogueHtml).toContain(
            '/cdn/assets/images/portraits/narrator.png'
        );
        expect(characterHtml).toContain(
            '/cdn/assets/images/portraits/sage.png'
        );
        expect(inventoryHtml).toContain(
            '/cdn/assets/images/items/coin_icon.png'
        );
        expect(mapHtml).toContain('/cdn/assets/images/maps/town.png');
    });

    it('renders GameRenderer through GameProvider with dialogue and interlude', () => {
        const engine = new Engine(makeRegistry(), makeState());
        const snapshot = makeSnapshot({
            dialogue: {
                speaker: null,
                speakerName: 'Narrator',
                text: 'You arrive in town.',
                continueEndsDialogue: true,
            },
            choices: [],
            pendingInterlude: {
                id: 'opening',
                background: '/images/opening.jpg',
                text: 'Opening text.',
                scroll: true,
                scrollSpeed: 30,
            },
        });

        const html = renderToStaticMarkup(
            <GameProvider engine={engine} initialSnapshot={snapshot}>
                <GameRenderer />
            </GameProvider>
        );

        expect(html).toContain('game-renderer');
        expect(html).toContain('interlude-overlay');
        expect(html).toContain('You arrive in town.');
        expect(html).toContain('continue-button');
        expect(html).toContain('End Dialogue');
    });
});
