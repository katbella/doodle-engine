/**
 * Tests for content validation.
 */

import { describe, expect, it } from 'vitest';
import type {
    ContentRegistry,
    Dialogue,
    GameConfig,
} from '@doodle-engine/core';
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
        title: 'Test Game',
        startLocation: 'town',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
        ...overrides,
    };
}

describe('validateContent', () => {
    it('accepts valid player profiles and character stat conditions', () => {
        const registry = makeRegistry({
            player: {
                name: 'Player',
                stats: {
                    strength: { name: 'Strength', value: 16.2 },
                    class: { name: 'Class', value: 'ranger' },
                },
            },
            dialogues: {
                test_dialogue: makeDialogueWithCondition({
                    type: 'characterStatGreaterThan',
                    characterId: 'player',
                    stat: 'strength',
                    value: 16.1,
                }),
            },
        });

        expect(
            validateContent(
                registry,
                new Map(),
                makeConfig({ playerCreatesProfile: true })
            )
        ).toEqual([]);
    });

    it('rejects invalid stat values and the reserved player character id', () => {
        const registry = makeRegistry({
            player: {
                name: 'Hero',
                stats: {
                    invalid: {
                        name: 'Invalid',
                        value: true,
                    } as any,
                },
            },
            characters: {
                player: {
                    id: 'player',
                    name: 'Imposter',
                    biography: '',
                    portrait: '',
                    location: 'town',
                    dialogue: '',
                    stats: {},
                },
            },
        });

        const result = messages(registry);
        expect(
            result.some((message) =>
                message.includes('must have a display name')
            )
        ).toBe(true);
        expect(
            result.some((message) =>
                message.includes('reserved for the player profile')
            )
        ).toBe(true);
    });

    it('validates the game profile flag', () => {
        const registry = makeRegistry({
            player: {
                name: 'Hero',
                stats: {},
            },
        });

        const result = validateContent(
            registry,
            new Map(),
            makeConfig({ playerCreatesProfile: 'yes' as any })
        );

        expect(
            result.some((error) =>
                error.message.includes(
                    'Game config playerCreatesProfile must be true or false'
                )
            )
        ).toBe(true);
    });

    it('accepts valid map structure', () => {
        expect(
            validateContent(makeRegistry(), new Map(), makeConfig())
        ).toEqual([]);
    });

    it('rejects unsupported characters in content and dialogue ids', () => {
        const dialogue: Dialogue = {
            id: 'bad-dialogue',
            startNode: 'start-node',
            nodes: [
                {
                    id: 'start-node',
                    speaker: null,
                    text: 'Hello.',
                    choices: [],
                },
            ],
        };
        const errors = messages(
            makeRegistry({
                locations: {
                    'old-town': {
                        id: 'old-town',
                        name: 'Old Town',
                        description: 'A town.',
                        banner: '',
                        music: '',
                        ambient: '',
                    },
                },
                dialogues: { 'bad-dialogue': dialogue },
            })
        );

        expect(errors).toContain(
            'Location id "old-town" must use only letters, numbers, and underscores'
        );
        expect(errors).toContain(
            'Dialogue id "bad-dialogue" must use only letters, numbers, and underscores'
        );
        expect(errors).toContain(
            'Dialogue "bad-dialogue" node id "start-node" must use only letters, numbers, and underscores'
        );
    });

    it('rejects unsupported characters in flags and variables', () => {
        const dialogue: Dialogue = {
            id: 'test_dialogue',
            startNode: 'start',
            nodes: [
                {
                    id: 'start',
                    speaker: null,
                    text: 'Hello.',
                    choices: [],
                    conditions: [{ type: 'hasFlag', flag: 'met-bartender' }],
                    effects: [
                        {
                            type: 'setVariable',
                            variable: 'player-name',
                            value: 'Kat',
                        },
                    ],
                },
            ],
        };
        const errors = validateContent(
            makeRegistry({ dialogues: { test_dialogue: dialogue } }),
            new Map(),
            makeConfig({
                startFlags: { 'seen-intro': false },
                startVariables: { 'starting-gold': 5 },
            })
        ).map((error) => error.message);

        expect(errors).toContain(
            'Game config flag "seen-intro" must use only letters, numbers, and underscores'
        );
        expect(errors).toContain(
            'Game config variable "starting-gold" must use only letters, numbers, and underscores'
        );
        expect(errors).toContain(
            'Node "start" condition "hasFlag" argument "flag" must use only letters, numbers, and underscores'
        );
        expect(errors).toContain(
            'Node "start" effect "setVariable" argument "variable" must use only letters, numbers, and underscores'
        );
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
            'Game config missing required "title"'
        );
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

    it('requires timeIs hours to be between 0 and 23', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: makeDialogueWithCondition({
                    type: 'timeIs',
                    startHour: -1,
                    endHour: 24,
                }),
            },
        });

        expect(messages(registry)).toContain(
            'Node "start" condition "timeIs" argument "startHour" must be between 0 and 23'
        );
        expect(messages(registry)).toContain(
            'Node "start" condition "timeIs" argument "endHour" must be between 0 and 23'
        );
    });

    it('validates stat names used in conditions and effects', () => {
        const dialogue = makeDialogue([
            {
                type: 'setCharacterStat',
                characterId: 'player',
                stat: 'combat-power',
                value: 5,
            },
        ]);
        dialogue.nodes[0].conditions = [
            {
                type: 'characterStatGreaterThan',
                characterId: 'player',
                stat: 'combat-power',
                value: 2,
            },
        ];
        const registry = makeRegistry({
            dialogues: { test_dialogue: dialogue },
        });

        expect(messages(registry)).toContain(
            'Node "start" condition "characterStatGreaterThan" argument "stat" must use only letters, numbers, and underscores'
        );
        expect(messages(registry)).toContain(
            'Node "start" effect "setCharacterStat" argument "stat" must use only letters, numbers, and underscores'
        );
    });

    it('reports duplicate choice IDs within a node', () => {
        const registry = makeRegistry({
            dialogues: {
                test_dialogue: {
                    id: 'test_dialogue',
                    startNode: 'start',
                    nodes: [
                        {
                            id: 'start',
                            speaker: null,
                            text: 'Hello.',
                            choices: [
                                {
                                    id: 'start_choice_yes',
                                    text: 'Yes',
                                    effects: [{ type: 'endDialogue' }],
                                    next: '',
                                },
                                {
                                    id: 'start_choice_yes',
                                    text: 'Yes again',
                                    effects: [{ type: 'endDialogue' }],
                                    next: '',
                                },
                            ],
                        },
                    ],
                },
            },
        });

        expect(messages(registry)).toContain(
            'Node "start" has duplicate choice ID "start_choice_yes"'
        );
    });
});
