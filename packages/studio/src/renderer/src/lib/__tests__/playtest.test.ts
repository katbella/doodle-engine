import { describe, it, expect } from 'vitest';
import type { ContentRegistry, GameConfig } from '@doodle-engine/core';
import { PlaytestSession, reloadSession } from '../playtest';

function registry(): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'Tavern',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
            market: {
                id: 'market',
                name: 'Market',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {
            bartender: {
                id: 'bartender',
                name: 'Marcus',
                biography: '',
                portrait: '',
                location: 'tavern',
                dialogue: 'bartender',
                stats: {},
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
            bartender: {
                id: 'bartender',
                startNode: 'rumors',
                nodes: [
                    {
                        id: 'rumors',
                        speaker: 'bartender',
                        text: 'Heard the captain has been paying the miller.',
                        effects: [{ type: 'addItem', itemId: 'old_coin' }],
                        choices: [
                            {
                                id: 'interesting',
                                text: '@bartender.choice.interesting',
                                effects: [],
                                next: 'start',
                            },
                            {
                                id: 'buy_drink',
                                text: "Let's talk business.",
                                conditions: [
                                    {
                                        type: 'variableGreaterThan',
                                        variable: 'gold',
                                        value: 4,
                                    },
                                ],
                                effects: [],
                                next: 'start',
                            },
                            {
                                id: 'quest',
                                text: 'About that quest…',
                                conditions: [
                                    {
                                        type: 'questAtStage',
                                        questId: 'odd_jobs',
                                        stageId: 'started',
                                    },
                                ],
                                effects: [],
                                next: 'start',
                            },
                        ],
                    },
                    {
                        id: 'start',
                        speaker: 'bartender',
                        text: 'Anything else?',
                        choices: [],
                        effects: [{ type: 'endDialogue' }],
                    },
                ],
            },
        },
        quests: {
            odd_jobs: {
                id: 'odd_jobs',
                name: 'Odd Jobs',
                description: '',
                stages: [
                    { id: 'started', description: 'Find work' },
                    { id: 'done', description: 'Done' },
                ],
            },
        },
        journalEntries: {},
        interludes: {},
        locales: {
            en: { 'bartender.choice.interesting': "That's interesting." },
        },
    };
}

function config(): GameConfig {
    return {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: { gold: 2 },
        startInventory: [],
    };
}

describe('PlaytestSession', () => {
    it('starts a dialogue at a chosen node and runs its effects', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        expect(session.inDialogue()).toBe(true);
        expect(session.getSnapshot().dialogue?.text).toContain('captain');
        expect(session.getState().inventory).toContain('old_coin');
    });

    it('shows every choice, marking hidden ones with the exact requirement and live value', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        const rows = session.choiceRows();
        const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

        expect(byId.interesting.visible).toBe(true);

        expect(byId.buy_drink.visible).toBe(false);
        expect(byId.buy_drink.requirement).toBe('variableGreaterThan gold 4');
        expect(byId.buy_drink.reason).toBe('gold is 2');

        expect(byId.quest.visible).toBe(false);
        expect(byId.quest.requirement).toBe('questAtStage odd_jobs started');
        expect(byId.quest.reason).toBe('quest is not started');
    });

    it('resolves a choice @key to its locale string and keeps the key', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        const interesting = session
            .choiceRows()
            .find((r) => r.id === 'interesting');
        expect(interesting?.display.text).toBe("That's interesting.");
        expect(interesting?.display.key).toBe('@bartender.choice.interesting');
    });

    it('leaves a plain (non-@key) choice without a key', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        const quest = session.choiceRows().find((r) => r.id === 'quest');
        expect(quest?.display.text).toBe('About that quest…');
        expect(quest?.display.key).toBeUndefined();
    });

    it('reveals a gated choice after a state edit through the official effect path', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        session.applyEffect({
            type: 'setQuestStage',
            questId: 'odd_jobs',
            stageId: 'started',
        });

        const quest = session.choiceRows().find((r) => r.id === 'quest');
        expect(quest?.visible).toBe(true);
    });

    it('records a decision trace with the expected event kinds', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');

        const kinds = new Set(session.getTrace().map((e) => e.kind));
        expect(kinds.has('nodeEnter')).toBe(true);
        expect(kinds.has('effect')).toBe(true); // addItem old_coin ran on entry
        expect(kinds.has('choiceFiltered')).toBe(true); // two gated choices
    });

    it('teleports to a location off the current map', () => {
        const session = new PlaytestSession(registry(), config());
        session.teleport('market');
        expect(session.getState().currentLocation).toBe('market');
    });

    it('restart returns to the configured start state and clears the trace', () => {
        const session = new PlaytestSession(registry(), config());
        session.startAtNode('bartender', 'rumors');
        session.applyEffect({ type: 'setFlag', flag: 'poked' });

        session.restart();

        expect(session.getState().flags.poked).toBeUndefined();
        expect(session.getTrace()).toHaveLength(0);
    });

    it('saves and restores a named test state', () => {
        const session = new PlaytestSession(registry(), config());
        session.applyEffect({
            type: 'setQuestStage',
            questId: 'odd_jobs',
            stageId: 'started',
        });
        const saved = session.saveTestState('after odd_jobs');

        session.restart();
        expect(session.getState().questProgress.odd_jobs).toBeUndefined();

        session.loadTestState(saved);
        expect(session.getState().questProgress.odd_jobs).toBe('started');
    });

    it('bumps version on each action so a view can react', () => {
        const session = new PlaytestSession(registry(), config());
        const v0 = session.version;
        session.startAtNode('bartender', 'rumors');
        expect(session.version).toBeGreaterThan(v0);
    });

    describe('reloadSession', () => {
        it('reflects edited content while keeping the tester at the same node', () => {
            const session = new PlaytestSession(registry(), config(), '/p');
            session.startAtNode('bartender', 'rumors');
            session.applyEffect({ type: 'setFlag', flag: 'poked' });

            // The author edits the node's line and re-validates: a new registry.
            const edited = registry();
            edited.dialogues.bartender.nodes[0].text =
                'The captain fled north.';

            const reloaded = reloadSession(session, edited, config(), '/p');

            // The edit reached the playtest…
            expect(reloaded.getSnapshot().dialogue?.text).toContain(
                'fled north'
            );
            // …and the tester kept their place and state.
            expect(reloaded.getState().dialogueState?.nodeId).toBe('rumors');
            expect(reloaded.getState().flags.poked).toBe(true);
        });

        it('starts fresh when the node the tester was on was removed', () => {
            const session = new PlaytestSession(registry(), config(), '/p');
            session.startAtNode('bartender', 'rumors');

            // The author deletes the 'rumors' node the tester was resting on.
            const edited = registry();
            edited.dialogues.bartender.nodes =
                edited.dialogues.bartender.nodes.filter(
                    (n) => n.id !== 'rumors'
                );

            const reloaded = reloadSession(session, edited, config(), '/p');

            // It didn't resume on the missing node; it's back at the start state.
            expect(reloaded.getState().dialogueState).toBeNull();
        });
    });
});
