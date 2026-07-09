/**
 * Tests for CLI content validation.
 */

import { describe, expect, it } from 'vitest';
import type { ContentRegistry, Dialogue, GameConfig } from '@doodle-engine/core';
import { validateContent } from '../validate';

function makeRegistry(
    overrides: Partial<ContentRegistry> = {}
): ContentRegistry {
    return {
        locations: {
            town: {
                id: 'town',
                name: 'Town',
                description: 'A town.',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {},
        items: {},
        maps: {
            town: {
                id: 'town',
                name: 'Town Map',
                image: '',
                scale: 1,
                locations: [{ id: 'town', x: 0, y: 0 }],
            },
        },
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: { en: {} },
        ...overrides,
    };
}

function makeDialogue(effects: Dialogue['nodes'][number]['effects']): Dialogue {
    return {
        id: 'test_dialogue',
        startNode: 'start',
        nodes: [
            {
                id: 'start',
                speaker: null,
                text: 'Hello.',
                choices: [],
                effects,
            },
        ],
    };
}

function makeDialogueWithCondition(condition: any): Dialogue {
    return {
        id: 'test_dialogue',
        startNode: 'start',
        nodes: [
            {
                id: 'start',
                speaker: null,
                text: 'Hello.',
                choices: [],
                conditions: [condition],
            },
        ],
    };
}

function messages(registry: ContentRegistry): string[] {
    return validateContent(registry, new Map()).map((error) => error.message);
}

function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
    return {
        startLocation: 'town',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
        ...overrides,
    };
}

describe('validateContent', () => {
    it('accepts valid map structure', () => {
        expect(
            validateContent(makeRegistry(), new Map(), makeConfig())
        ).toEqual([]);
    });

    it('rejects game config with missing start location', () => {
        const errors = validateContent(
            makeRegistry(),
            new Map(),
            makeConfig({ startLocation: 'missing' })
        );

        expect(errors.map((error) => error.message)).toContain(
            'Game config startLocation "missing" does not exist'
        );
    });

    it('rejects game config with missing start inventory item', () => {
        const errors = validateContent(
            makeRegistry(),
            new Map(),
            makeConfig({ startInventory: ['missing_item'] })
        );

        expect(errors.map((error) => error.message)).toContain(
            'Game config startInventory references non-existent item "missing_item"'
        );
    });

    it('reports malformed game config without throwing', () => {
        const errors = validateContent(makeRegistry(), new Map(), {
            startLocation: '',
            startTime: undefined,
            startFlags: {},
            startVariables: {},
            startInventory: undefined,
        } as any);

        expect(errors.map((error) => error.message)).toContain(
            'Game config missing required "startLocation"'
        );
        expect(errors.map((error) => error.message)).toContain(
            'Game config missing required "startTime.day" or "startTime.hour"'
        );
        expect(errors.map((error) => error.message)).toContain(
            'Game config startInventory must be an array'
        );
    });

    it('rejects maps that reference missing locations', () => {
        const registry = makeRegistry({
            maps: {
                town: {
                    id: 'town',
                    name: 'Town Map',
                    image: '',
                    scale: 1,
                    locations: [{ id: 'missing', x: 0, y: 0 }],
                },
            },
        });

        expect(messages(registry)).toContain(
            'Map "town" references non-existent location "missing"'
        );
    });

    it('accepts multiple maps when markers are distinct', () => {
        const registry = makeRegistry({
            locations: {
                town: {
                    id: 'town',
                    name: 'Town',
                    description: 'A town.',
                    banner: '',
                    music: '',
                    ambient: '',
                },
                gate: {
                    id: 'gate',
                    name: 'Gate',
                    description: 'A gate.',
                    banner: '',
                    music: '',
                    ambient: '',
                },
            },
            maps: {
                town: {
                    id: 'town',
                    name: 'Town Map',
                    image: '',
                    scale: 1,
                    locations: [{ id: 'town', x: 0, y: 0 }],
                },
                town_detail: {
                    id: 'town_detail',
                    name: 'Town Detail',
                    image: '',
                    scale: 1,
                    locations: [{ id: 'gate', x: 1, y: 1 }],
                },
            },
        });

        expect(validateContent(registry, new Map())).toEqual([]);
    });

    it('rejects locations that appear on multiple maps', () => {
        const registry = makeRegistry({
            maps: {
                town: {
                    id: 'town',
                    name: 'Town Map',
                    image: '',
                    scale: 1,
                    locations: [{ id: 'town', x: 0, y: 0 }],
                },
                town_detail: {
                    id: 'town_detail',
                    name: 'Town Detail',
                    image: '',
                    scale: 1,
                    locations: [{ id: 'town', x: 1, y: 1 }],
                },
            },
        });

        expect(messages(registry)).toContain(
            'Location "town" appears on multiple maps: town, town_detail'
        );
    });

    it('accepts locations that are not on a map', () => {
        const registry = makeRegistry({
            maps: {},
        });

        expect(validateContent(registry, new Map())).toEqual([]);
    });

    it('accepts bare playMusic effects', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogue([{ type: 'playMusic' }]),
            },
        });

        expect(validateContent(registry, new Map())).toEqual([]);
    });

    it('still validates required fields on other effects', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogue([{ type: 'playSound' } as any]),
            },
        });

        expect(messages(registry)).toContain(
            'Node "start" effect "playSound" missing required "sound" argument'
        );
    });

    it('does not add undefined reference noise when required fields are missing', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogueWithCondition({
                    type: 'hasItem',
                }),
            },
        });
        const result = messages(registry);

        expect(result).toContain(
            'Node "start" condition "hasItem" missing required "itemId" argument'
        );
        expect(result.some((message) => message.includes('"undefined"'))).toBe(
            false
        );
    });

    it('rejects built-in effects that reference missing entities', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogue([
                    { type: 'goToLocation', locationId: 'missing_place' },
                    { type: 'addItem', itemId: 'missing_item' },
                    { type: 'startDialogue', dialogueId: 'missing_dialogue' },
                ]),
            },
        });

        expect(messages(registry)).toContain(
            'Node "start" effect "goToLocation" references non-existent location "missing_place"'
        );
        expect(messages(registry)).toContain(
            'Node "start" effect "addItem" references non-existent item "missing_item"'
        );
        expect(messages(registry)).toContain(
            'Node "start" effect "startDialogue" references non-existent dialogue "missing_dialogue"'
        );
    });

    it('does not validate required fields for unknown effect types', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogue([
                    { type: 'unknownEffect', targetId: 'not_validated' } as any,
                ]),
            },
        });

        expect(validateContent(registry, new Map())).toEqual([]);
    });
});
