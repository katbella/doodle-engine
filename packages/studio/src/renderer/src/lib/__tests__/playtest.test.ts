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

        const firstRead = session.getTrace();
        const secondRead = session.getTrace();
        const kinds = new Set(firstRead.map((e) => e.kind));
        expect(secondRead).not.toBe(firstRead);
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

    it('exposes the current speaker line and runs choice and locale actions', () => {
        const session = new PlaytestSession(registry(), config());
        expect(session.speakerLine()).toBeNull();

        session.startAtNode('bartender', 'rumors');
        expect(session.speakerLine()).toEqual({
            text: 'Heard the captain has been paying the miller.',
        });

        const beforeChoice = session.version;
        session.selectChoice('interesting');
        expect(session.version).toBe(beforeChoice + 1);
        expect(session.speakerLine()?.text).toBe('Anything else?');

        const beforeLocale = session.version;
        session.setLocale('en');
        expect(session.version).toBe(beforeLocale + 1);
    });

    it('continues a linear node and can clear the resulting trace', () => {
        const content = registry();
        content.dialogues.bartender.nodes.push({
            id: 'linear',
            speaker: 'bartender',
            text: 'One more thing.',
            choices: [],
            effects: [],
            next: 'start',
        });
        const session = new PlaytestSession(content, config());

        session.startAtNode('bartender', 'linear');
        expect(session.speakerLine()?.text).toBe('One more thing.');
        const beforeContinue = session.version;
        session.continue();
        expect(session.version).toBe(beforeContinue + 1);
        expect(session.speakerLine()?.text).toBe('Anything else?');
        session.continue();
        expect(session.inDialogue()).toBe(false);
        expect(session.getTrace().length).toBeGreaterThan(0);

        const beforeClear = session.version;
        session.clearTrace();
        expect(session.getTrace()).toHaveLength(0);
        expect(session.version).toBe(beforeClear + 1);
    });

    it('explains each hidden world-state requirement in writer-facing terms', () => {
        const content = registry();
        content.dialogues.bartender.nodes[0].choices.push(
            {
                id: 'flag',
                text: 'Flag',
                conditions: [{ type: 'hasFlag', flag: 'introduced' }],
                effects: [],
                next: 'start',
            },
            {
                id: 'not-flag',
                text: 'Not flag',
                conditions: [{ type: 'notFlag', flag: 'doorLocked' }],
                effects: [],
                next: 'start',
            },
            {
                id: 'item',
                text: 'Item',
                conditions: [{ type: 'hasItem', itemId: 'missing_key' }],
                effects: [],
                next: 'start',
            },
            {
                id: 'location',
                text: 'Location',
                conditions: [{ type: 'atLocation', locationId: 'market' }],
                effects: [],
                next: 'start',
            },
            {
                id: 'character-location',
                text: 'Character location',
                conditions: [
                    {
                        type: 'characterAt',
                        characterId: 'bartender',
                        locationId: 'market',
                    },
                ],
                effects: [],
                next: 'start',
            },
            {
                id: 'party',
                text: 'Party',
                conditions: [
                    {
                        type: 'characterInParty',
                        characterId: 'bartender',
                    },
                ],
                effects: [],
                next: 'start',
            },
            {
                id: 'relationship-above',
                text: 'Relationship above',
                conditions: [
                    {
                        type: 'relationshipAbove',
                        characterId: 'bartender',
                        value: 1,
                    },
                ],
                effects: [],
                next: 'start',
            },
            {
                id: 'relationship-below',
                text: 'Relationship below',
                conditions: [
                    {
                        type: 'relationshipBelow',
                        characterId: 'bartender',
                        value: -1,
                    },
                ],
                effects: [],
                next: 'start',
            },
            {
                id: 'time',
                text: 'Time',
                conditions: [{ type: 'timeIs', startHour: 20, endHour: 23 }],
                effects: [],
                next: 'start',
            },
            {
                id: 'item-location',
                text: 'Item location',
                conditions: [
                    {
                        type: 'itemAt',
                        itemId: 'old_coin',
                        locationId: 'market',
                    },
                ],
                effects: [],
                next: 'start',
            },
            {
                id: 'roll',
                text: 'Roll',
                conditions: [{ type: 'roll', min: 1, max: 1, threshold: 2 }],
                effects: [],
                next: 'start',
            }
        );
        const start = config();
        start.startFlags.doorLocked = true;
        const session = new PlaytestSession(content, start);

        session.startAtNode('bartender', 'rumors');
        const reasons = Object.fromEntries(
            session.choiceRows().map((row) => [row.id, row.reason])
        );

        expect(reasons).toMatchObject({
            flag: 'flag introduced is not set',
            'not-flag': 'flag doorLocked is set',
            item: 'missing_key not in inventory',
            location: 'at tavern',
            'character-location': 'bartender is at tavern',
            party: 'bartender not in party',
            'relationship-above': 'relationship is 0',
            'relationship-below': 'relationship is 0',
            time: 'hour is 8',
            'item-location': 'old_coin is at inventory',
            roll: 'roll did not meet the threshold',
        });
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
