import { describe, it, expect } from 'vitest';
import { parseDialogue } from '../parser';
import type { ContentRegistry } from '../types/registry';
import type { GameConfig } from '../types/entities';
import { ReferenceIndex } from '../reference-index';

function registry(over: Partial<ContentRegistry>): ContentRegistry {
    return {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
        ...over,
    };
}

const DLG = `NODE start
  BARTENDER: The bartender greets you.
  IF hasItem old_coin
    SET flag greeted
    ADD relationship bartender 1
  END
  CHOICE Ask about the tavern
    REQUIRE atLocation tavern
    GOTO start
  END
`;

function build() {
    const dialogue = parseDialogue(DLG, 'chat');
    const reg = registry({
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Marcus',
                biography: '',
                portrait: '',
                location: 'tavern',
                dialogue: 'chat',
                stats: {},
            },
        },
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
            unused_room: {
                id: 'unused_room',
                name: 'Unused',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        items: {
            old_coin: {
                id: 'old_coin',
                name: 'Old Coin',
                description: '',
                icon: '',
                image: '',
                location: 'tavern',
                stats: {},
            },
        },
        dialogues: { chat: dialogue },
    });
    const fileMap = new Map([
        ['characters:bartender', 'content/characters/bartender.yaml'],
        ['locations:tavern', 'content/locations/tavern.yaml'],
        ['items:old_coin', 'content/items/old_coin.yaml'],
        ['dialogues:chat', 'content/dialogues/chat.dlg'],
    ]);
    const config: GameConfig = {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: ['old_coin'],
    };
    return new ReferenceIndex(reg, fileMap, config);
}

describe('ReferenceIndex.find', () => {
    it('finds a character referenced as a speaker and in an effect', () => {
        const refs = build().find('characters', 'bartender');
        const where = refs.map((r) => r.where);
        expect(where).toContain('dialogue "chat" node "start" speaker');
        expect(where.some((w) => w.includes('node "start"'))).toBe(true);
    });

    it('finds a location referenced by a character, an item, config, and a condition', () => {
        const refs = build().find('locations', 'tavern');
        const where = refs.map((r) => r.where);
        expect(where).toContain('character "bartender" location');
        expect(where).toContain('item "old_coin" location');
        expect(where).toContain('game config start location');
        // The `atLocation tavern` requirement in the choice.
        expect(where.some((w) => w.includes('dialogue "chat"'))).toBe(true);
    });

    it('finds an item referenced by a condition and start inventory', () => {
        const where = build()
            .find('items', 'old_coin')
            .map((r) => r.where);
        expect(where).toContain('game config start inventory');
        expect(where.some((w) => w.includes('dialogue "chat"'))).toBe(true);
    });

    it('finds a flag written by an effect', () => {
        expect(build().count('flags', 'greeted')).toBeGreaterThan(0);
        expect(build().find('flags', 'greeted')[0].access).toBe('set');
    });

    it('classifies flag and variable checks, effects, and starting values', () => {
        const index = new ReferenceIndex(
            registry({
                dialogues: {
                    state: {
                        id: 'state',
                        startNode: 'start',
                        nodes: [
                            {
                                id: 'start',
                                speaker: null,
                                text: 'State.',
                                conditions: [
                                    { type: 'hasFlag', flag: 'ready' },
                                    {
                                        type: 'variableEquals',
                                        variable: 'score',
                                        value: 2,
                                    },
                                ],
                                effects: [
                                    { type: 'setFlag', flag: 'ready' },
                                    {
                                        type: 'setVariable',
                                        variable: 'score',
                                        value: 3,
                                    },
                                ],
                                choices: [],
                            },
                        ],
                    },
                },
            }),
            new Map(),
            {
                startLocation: '',
                startTime: { day: 1, hour: 8 },
                startFlags: { introduced: true },
                startVariables: { chapter: 1 },
                startInventory: [],
            }
        );

        expect(index.find('flags', 'ready').map((ref) => ref.access)).toEqual([
            'check',
            'set',
        ]);
        expect(
            index.find('variables', 'score').map((ref) => ref.access)
        ).toEqual(['check', 'set']);
        expect(index.find('flags', 'introduced')[0].access).toBe('set');
        expect(index.find('variables', 'chapter')[0].access).toBe('set');
    });

    it('records the file each reference lives in', () => {
        const refs = build().find('characters', 'bartender');
        expect(refs.every((r) => r.file === 'content/dialogues/chat.dlg')).toBe(
            true
        );
    });

    it('returns nothing for an unreferenced id', () => {
        expect(build().find('locations', 'nope')).toEqual([]);
    });
});

describe('ReferenceIndex.orphans', () => {
    it('reports a defined location that nothing references', () => {
        expect(build().orphans('locations')).toContain('unused_room');
    });

    it('does not report a referenced location as an orphan', () => {
        expect(build().orphans('locations')).not.toContain('tavern');
    });
});

describe('ReferenceIndex trigger conditions', () => {
    it('finds an item used by a dialogue top-level REQUIRE', () => {
        const index = new ReferenceIndex(
            registry({
                items: {
                    coin: {
                        id: 'coin',
                        name: 'Coin',
                        description: '',
                        location: 'inventory',
                        stats: {},
                    },
                },
                dialogues: {
                    gated: {
                        id: 'gated',
                        startNode: 'start',
                        conditions: [{ type: 'hasItem', itemId: 'coin' }],
                        nodes: [
                            {
                                id: 'start',
                                speaker: null,
                                text: 'Hello.',
                                choices: [],
                            },
                        ],
                    },
                },
            }),
            new Map()
        );
        const refs = index.find('items', 'coin');
        expect(refs.length).toBe(1);
        expect(refs[0].where).toContain('requirement');
    });

    it('finds an item used by an interlude trigger condition', () => {
        const index = new ReferenceIndex(
            registry({
                items: {
                    coin: {
                        id: 'coin',
                        name: 'Coin',
                        description: '',
                        location: 'inventory',
                        stats: {},
                    },
                },
                interludes: {
                    intro: {
                        id: 'intro',
                        text: 'Chapter One',
                        triggerConditions: [
                            { type: 'hasItem', itemId: 'coin' },
                        ],
                        effects: [],
                    },
                },
            }),
            new Map()
        );
        const refs = index.find('items', 'coin');
        expect(refs.length).toBe(1);
        expect(refs[0].where).toContain('trigger condition');
    });
});
