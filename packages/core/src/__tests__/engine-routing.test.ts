/**
 * Tests for the engine's automatic-routing allowance and travel guards.
 *
 * Silent nodes and START dialogue redirects advance on their own, so the
 * engine caps how far one player action can auto-route. These tests cover
 * the cap and the refusal to travel on a map with an unusable scale.
 */

import { describe, it, expect } from 'vitest';
import { Engine } from '../engine';
import type { ContentRegistry } from '../types/registry';
import type { GameConfig, DialogueNode } from '../types/entities';

function registryWith(
    dialogues: ContentRegistry['dialogues']
): ContentRegistry {
    return {
        locations: {
            town: { id: 'town', name: 'Town', description: 'A town' },
        },
        characters: {
            bob: {
                id: 'bob',
                name: 'Bob',
                biography: '',
                location: 'town',
                dialogue: Object.keys(dialogues)[0],
                stats: {},
            },
        },
        items: {},
        maps: {},
        dialogues,
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    };
}

const config: GameConfig = {
    startLocation: 'town',
    startTime: { day: 1, hour: 8 },
    startFlags: {},
    startVariables: {},
    startInventory: [],
};

function silentChain(prefix: string, count: number): DialogueNode[] {
    const nodes: DialogueNode[] = [];
    for (let i = 0; i < count; i++) {
        nodes.push({
            id: `${prefix}${i}`,
            speaker: null,
            text: '',
            choices: [],
            next: `${prefix}${i + 1}`,
        });
    }
    return nodes;
}

describe('automatic routing allowance', () => {
    it('ends the dialogue when a silent node routes to itself', () => {
        const engine = new Engine(
            registryWith({
                loop: {
                    id: 'loop',
                    startNode: 'spin',
                    nodes: [
                        {
                            id: 'spin',
                            speaker: null,
                            text: '',
                            choices: [],
                            effects: [{ type: 'setFlag', flag: 'x' }],
                            next: 'spin',
                        },
                    ],
                },
            })
        );
        engine.newGame(config);
        const snapshot = engine.talkTo('bob');
        expect(snapshot.dialogue).toBeNull();
    });

    it('ends the dialogue when two silent nodes route to each other', () => {
        const engine = new Engine(
            registryWith({
                loop: {
                    id: 'loop',
                    startNode: 'a',
                    nodes: [
                        {
                            id: 'a',
                            speaker: null,
                            text: '',
                            choices: [],
                            next: 'b',
                        },
                        {
                            id: 'b',
                            speaker: null,
                            text: '',
                            choices: [],
                            next: 'a',
                        },
                    ],
                },
            })
        );
        engine.newGame(config);
        const snapshot = engine.talkTo('bob');
        expect(snapshot.dialogue).toBeNull();
    });

    it('ends the dialogue when two dialogues start each other', () => {
        const engine = new Engine(
            registryWith({
                first: {
                    id: 'first',
                    startNode: 'go',
                    nodes: [
                        {
                            id: 'go',
                            speaker: null,
                            text: '',
                            choices: [],
                            effects: [
                                { type: 'startDialogue', dialogueId: 'second' },
                            ],
                        },
                    ],
                },
                second: {
                    id: 'second',
                    startNode: 'back',
                    nodes: [
                        {
                            id: 'back',
                            speaker: null,
                            text: '',
                            choices: [],
                            effects: [
                                { type: 'startDialogue', dialogueId: 'first' },
                            ],
                        },
                    ],
                },
            })
        );
        engine.newGame(config);
        const snapshot = engine.talkTo('bob');
        expect(snapshot.dialogue).toBeNull();
    });

    it('reports the loop through the trace so authors can find it', () => {
        const engine = new Engine(
            registryWith({
                loop: {
                    id: 'loop',
                    startNode: 'spin',
                    nodes: [
                        {
                            id: 'spin',
                            speaker: null,
                            text: '',
                            choices: [],
                            next: 'spin',
                        },
                    ],
                },
            })
        );
        engine.newGame(config);
        const errors: string[] = [];
        engine.setTrace({ onError: (event) => errors.push(event.message) });
        engine.talkTo('bob');
        expect(errors.length).toBe(1);
        expect(errors[0]).toContain('loop');
    });

    it('still walks a long finite silent chain to its end', () => {
        const nodes = silentChain('n', 150);
        nodes.push({
            id: 'n150',
            speaker: null,
            text: 'Made it.',
            choices: [],
        });
        const engine = new Engine(
            registryWith({ chain: { id: 'chain', startNode: 'n0', nodes } })
        );
        engine.newGame(config);
        const snapshot = engine.talkTo('bob');
        expect(snapshot.dialogue?.text).toBe('Made it.');
    });

    it('gives every player action a fresh allowance', () => {
        // Two long silent stretches with a text node between them. Each
        // stretch fits the allowance on its own; together they only work
        // if the allowance resets between player actions.
        const nodes = silentChain('n', 150);
        nodes.push({
            id: 'n150',
            speaker: null,
            text: 'Stop here.',
            choices: [],
            next: 'again0',
        });
        nodes.push(...silentChain('again', 150));
        nodes.push({
            id: 'again150',
            speaker: null,
            text: 'Done.',
            choices: [],
        });
        const engine = new Engine(
            registryWith({ chain: { id: 'chain', startNode: 'n0', nodes } })
        );
        engine.newGame(config);
        engine.talkTo('bob');
        const snapshot = engine.continueDialogue();
        expect(snapshot.dialogue?.text).toBe('Done.');
    });
});

describe('travel with a bad map scale', () => {
    function registryWithScale(scale: number): ContentRegistry {
        return {
            locations: {
                a: { id: 'a', name: 'A', description: '' },
                b: { id: 'b', name: 'B', description: '' },
            },
            characters: {},
            items: {},
            maps: {
                world: {
                    id: 'world',
                    name: 'World',
                    image: 'map.png',
                    scale,
                    locations: [
                        { id: 'a', x: 0, y: 0 },
                        { id: 'b', x: 10, y: 0 },
                    ],
                },
            },
            dialogues: {},
            quests: {},
            journalEntries: {},
            interludes: {},
            locales: {},
        };
    }

    const travelConfig: GameConfig = {
        startLocation: 'a',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    };

    it.each([0, -1, NaN, Infinity])(
        'refuses to travel when the scale is %s',
        (scale) => {
            const engine = new Engine(registryWithScale(scale));
            engine.newGame(travelConfig);
            const snapshot = engine.travelTo('b');
            expect(snapshot.location.id).toBe('a');
            expect(Number.isFinite(snapshot.time.day)).toBe(true);
            expect(Number.isFinite(snapshot.time.hour)).toBe(true);
        }
    );

    it('travels normally with a positive scale', () => {
        const engine = new Engine(registryWithScale(10));
        engine.newGame(travelConfig);
        const snapshot = engine.travelTo('b');
        expect(snapshot.location.id).toBe('b');
        expect(snapshot.time.hour).toBe(9);
    });
});
