/**
 * Tests for the engine's debug / inspection / trace API.
 *
 * These methods exist for tooling (Doodle Studio's playtest, state inspector,
 * and debug trace). The core guarantees under test:
 * - reads return isolated clones; debug writes route through the real effect
 *   pipeline;
 * - you can start a dialogue at any node;
 * - you can learn why a choice is hidden;
 * - with a trace sink attached, the engine reports its decisions;
 * - with no sink, behavior is identical to running without tracing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '../engine';
import type { ContentRegistry } from '../types/registry';
import type { GameConfig } from '../types/entities';
import type { TraceEvent, TraceSink } from '../types/trace';

function createRegistry(): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: 'A cozy tavern',
                banner: '',
                music: '',
                ambient: '',
            },
            market: {
                id: 'market',
                name: 'Market',
                description: 'A busy market',
                banner: '',
                music: '',
                ambient: '',
            },
            keep: {
                id: 'keep',
                name: 'The Keep',
                description: 'Far off the map',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Marcus',
                biography: 'A bartender',
                portrait: '',
                location: 'tavern',
                dialogue: 'bartender_greeting',
                stats: {},
            },
        },
        items: {
            old_coin: {
                id: 'old_coin',
                name: 'Old Coin',
                description: 'A worn coin',
                icon: '',
                image: '',
                location: 'tavern',
                stats: {},
            },
        },
        maps: {
            city: {
                id: 'city',
                name: 'City',
                image: 'city.png',
                scale: 10,
                locations: [
                    { id: 'tavern', x: 0, y: 0 },
                    { id: 'market', x: 100, y: 0 },
                ],
            },
        },
        dialogues: {
            bartender_greeting: {
                id: 'bartender_greeting',
                startNode: 'intro',
                nodes: [
                    {
                        id: 'intro',
                        speaker: 'bartender',
                        text: 'Welcome!',
                        choices: [
                            {
                                id: 'ask_rumors',
                                text: 'Ask about rumors',
                                conditions: [
                                    { type: 'hasFlag', flag: 'trusted' },
                                ],
                                effects: [
                                    { type: 'setFlag', flag: 'heardRumors' },
                                ],
                                next: 'rumors',
                            },
                            {
                                id: 'leave',
                                text: 'Leave',
                                effects: [],
                                next: 'goodbye',
                            },
                        ],
                    },
                    {
                        id: 'rumors',
                        speaker: 'bartender',
                        text: 'The keep is haunted...',
                        choices: [],
                        effects: [{ type: 'addItem', itemId: 'old_coin' }],
                        conditionalBranches: [
                            {
                                condition: { type: 'hasFlag', flag: 'rich' },
                                next: 'goodbye',
                            },
                        ],
                        next: 'goodbye',
                    },
                    {
                        id: 'goodbye',
                        speaker: 'bartender',
                        text: 'Farewell.',
                        choices: [],
                        effects: [{ type: 'endDialogue' }],
                    },
                ],
            },
        },
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: { en: {} },
    };
}

function createConfig(): GameConfig {
    return {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: { gold: 10 },
        startInventory: [],
    };
}

describe('Engine debug / inspection API', () => {
    let engine: Engine;
    let registry: ContentRegistry;

    beforeEach(() => {
        registry = createRegistry();
        engine = new Engine(registry);
        engine.newGame(createConfig());
    });

    describe('getState', () => {
        it('returns the current state', () => {
            const state = engine.getState();
            expect(state.currentLocation).toBe('tavern');
            expect(state.variables.gold).toBe(10);
        });

        it('returns a deep clone that cannot mutate engine internals', () => {
            const state = engine.getState();
            state.flags.hacked = true;
            state.variables.gold = 9999;

            const fresh = engine.getState();
            expect(fresh.flags.hacked).toBeUndefined();
            expect(fresh.variables.gold).toBe(10);
        });
    });

    describe('applyDebugEffect', () => {
        it('routes through the real effect pipeline (set flag)', () => {
            engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });
            expect(engine.getState().flags.trusted).toBe(true);
        });

        it('applies an item effect the same way the runtime does', () => {
            engine.applyDebugEffect({ type: 'addItem', itemId: 'old_coin' });
            const state = engine.getState();
            expect(state.inventory).toContain('old_coin');
            expect(state.itemLocations.old_coin).toBe('inventory');
        });

        it('advances a quest stage through the official effect', () => {
            engine.applyDebugEffect({
                type: 'setQuestStage',
                questId: 'odd_jobs',
                stageId: 'started',
            });
            expect(engine.getState().questProgress.odd_jobs).toBe('started');
        });
    });

    describe('teleport', () => {
        it('reaches a location that is not on the current map', () => {
            engine.teleport('keep');
            expect(engine.getState().currentLocation).toBe('keep');
        });

        it('does not advance time (unlike travel)', () => {
            const before = engine.getState().currentTime;
            engine.teleport('market');
            expect(engine.getState().currentTime).toEqual(before);
        });
    });

    describe('startDialogueAt', () => {
        it('begins a dialogue at an arbitrary node', () => {
            const snapshot = engine.startDialogueAt(
                'bartender_greeting',
                'rumors'
            );
            expect(snapshot.dialogue?.text).toBe('The keep is haunted...');
            expect(engine.getState().dialogueState).toEqual({
                dialogueId: 'bartender_greeting',
                nodeId: 'rumors',
            });
        });

        it('runs the chosen node effects on entry', () => {
            engine.startDialogueAt('bartender_greeting', 'rumors');
            expect(engine.getState().inventory).toContain('old_coin');
        });

        it('leaves state unchanged for an unknown node', () => {
            const before = engine.getState();
            engine.startDialogueAt('bartender_greeting', 'nope');
            expect(engine.getState().dialogueState).toEqual(
                before.dialogueState
            );
        });
    });

    describe('explainChoices', () => {
        it('reports a visible choice with no requirements as visible', () => {
            engine.talkTo('bartender');
            const explained = engine.explainChoices();
            const leave = explained.find((c) => c.choiceId === 'leave');
            expect(leave?.visible).toBe(true);
        });

        it('explains why a gated choice is hidden', () => {
            engine.talkTo('bartender');
            const explained = engine.explainChoices();
            const ask = explained.find((c) => c.choiceId === 'ask_rumors');

            expect(ask?.visible).toBe(false);
            expect(ask?.failedCondition).toEqual({
                type: 'hasFlag',
                flag: 'trusted',
            });
            expect(ask?.resolvedValues).toEqual({ flag: false });
        });

        it('shows the gated choice once its requirement passes', () => {
            engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });
            engine.talkTo('bartender');
            const explained = engine.explainChoices();
            const ask = explained.find((c) => c.choiceId === 'ask_rumors');
            expect(ask?.visible).toBe(true);
        });

        it('returns an empty list when not in dialogue', () => {
            expect(engine.explainChoices()).toEqual([]);
        });
    });
});

describe('Engine debug tracing', () => {
    let registry: ContentRegistry;

    beforeEach(() => {
        registry = createRegistry();
    });

    function record(): { events: TraceEvent[]; sink: TraceSink } {
        const events: TraceEvent[] = [];
        const sink: TraceSink = {
            onNodeEnter: (e) => events.push(e),
            onCondition: (e) => events.push(e),
            onEffect: (e) => events.push(e),
            onTransition: (e) => events.push(e),
            onChoiceFiltered: (e) => events.push(e),
            onError: (e) => events.push(e),
        };
        return { events, sink };
    }

    it('records a node entry when a dialogue starts', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        const { events, sink } = record();
        engine.setTrace(sink);

        engine.talkTo('bartender');

        const enters = events.filter((e) => e.kind === 'nodeEnter');
        expect(enters[0]).toMatchObject({
            dialogueId: 'bartender_greeting',
            nodeId: 'intro',
        });
    });

    it('records an effect with the fields it changed', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        const { events, sink } = record();
        engine.setTrace(sink);

        engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });

        const effect = events.find((e) => e.kind === 'effect');
        expect(effect).toBeDefined();
        if (effect?.kind === 'effect') {
            expect(effect.effect).toEqual({ type: 'setFlag', flag: 'trusted' });
            expect(effect.delta.flags?.after).toMatchObject({ trusted: true });
        }
    });

    it('records a transition when advancing between nodes', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });
        engine.talkTo('bartender');

        const { events, sink } = record();
        engine.setTrace(sink);
        engine.selectChoice('ask_rumors');

        const transition = events.find((e) => e.kind === 'transition');
        expect(transition).toMatchObject({
            fromNode: 'intro',
            toNode: 'rumors',
        });
    });

    it('records a condition event for an IF branch with the values it saw', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });
        engine.talkTo('bartender');

        const { events, sink } = record();
        engine.setTrace(sink);
        // Advancing off 'rumors' evaluates its IF branch (hasFlag rich fails).
        engine.selectChoice('ask_rumors');
        engine.continueDialogue();

        const condition = events.find(
            (e) => e.kind === 'condition' && e.context.type === 'branch'
        );
        expect(condition).toBeDefined();
        if (condition?.kind === 'condition') {
            expect(condition.condition).toEqual({
                type: 'hasFlag',
                flag: 'rich',
            });
            expect(condition.result).toBe(false);
            expect(condition.resolvedValues).toEqual({ flag: false });
        }
    });

    it('records a choiceFiltered event for a hidden choice', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        const { events, sink } = record();
        engine.setTrace(sink);

        engine.talkTo('bartender');

        const filtered = events.find((e) => e.kind === 'choiceFiltered');
        expect(filtered).toMatchObject({
            choiceId: 'ask_rumors',
            failedCondition: { type: 'hasFlag', flag: 'trusted' },
        });
    });

    it('assigns monotonically increasing sequence numbers', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        const { events, sink } = record();
        engine.setTrace(sink);

        engine.talkTo('bartender');

        const seqs = events.map((e) => e.seq);
        const sorted = [...seqs].sort((a, b) => a - b);
        expect(seqs).toEqual(sorted);
        expect(new Set(seqs).size).toBe(seqs.length);
    });

    it('stops reporting after the sink is detached', () => {
        const engine = new Engine(registry);
        engine.newGame(createConfig());
        const { events, sink } = record();
        engine.setTrace(sink);
        engine.setTrace(null);

        engine.talkTo('bartender');

        expect(events).toHaveLength(0);
    });

    it('produces identical behavior with tracing on vs off', () => {
        // Run the same script on two engines: one traced, one not. The
        // resulting state must be identical — tracing observes, never changes.
        const scripted = (engine: Engine) => {
            engine.newGame(createConfig());
            engine.applyDebugEffect({ type: 'setFlag', flag: 'trusted' });
            engine.talkTo('bartender');
            engine.selectChoice('ask_rumors');
            engine.continueDialogue();
        };

        const plain = new Engine(createRegistry());
        scripted(plain);

        const traced = new Engine(createRegistry());
        const { sink } = record();
        traced.setTrace(sink);
        scripted(traced);

        expect(traced.getState()).toEqual(plain.getState());
    });
});
