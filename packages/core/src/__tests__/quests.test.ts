import { describe, expect, it } from 'vitest';
import { Engine, createInitialState } from '../engine';
import { getQuestStatus } from '../quests';
import { buildSnapshot } from '../snapshot';
import { evaluateCondition } from '../conditions';
import { applyEffect } from '../effects';
import { parseCondition, parseEffect } from '../parser';
import { serializeEffect } from '../parser/serialize';
import type { ContentRegistry } from '../types/registry';

function registry(): ContentRegistry {
    return {
        player: { stats: {} },
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {
            first: {
                id: 'first',
                name: 'First',
                description: 'First quest',
                stages: [
                    { id: 'started', description: 'Started' },
                    {
                        id: 'good_end',
                        description: 'Good ending',
                        completesQuest: true,
                    },
                    {
                        id: 'bad_end',
                        description: 'Bad ending',
                        completesQuest: true,
                    },
                ],
            },
            second: {
                id: 'second',
                name: 'Second',
                description: 'Second quest',
                stages: [{ id: 'started', description: 'Started' }],
            },
            third: {
                id: 'third',
                name: 'Third',
                description: 'Third quest',
                stages: [
                    {
                        id: 'done',
                        description: 'Done',
                        completesQuest: true,
                    },
                ],
            },
        },
        journalEntries: {},
        interludes: {},
        locales: { en: {} },
    };
}

describe('quest status and tracking', () => {
    it('parses, evaluates, and applies the new DSL forms', () => {
        const content = registry();
        const state = createInitialState();
        state.questProgress.first = 'started';

        const condition = parseCondition('questStatus first active');
        expect(condition).toEqual({
            type: 'questStatus',
            questId: 'first',
            status: 'active',
        });
        expect(evaluateCondition(condition, state, content)).toBe(true);
        expect(() => evaluateCondition(condition, state)).toThrow(
            'content registry is required'
        );
        expect(() => parseCondition('questStatus first pending')).toThrow();
        expect(() =>
            parseCondition('questStatus first active extra')
        ).toThrow();

        expect(parseEffect('SET trackedQuest first')).toEqual({
            type: 'setTrackedQuest',
            questId: 'first',
        });
        expect(parseEffect('SET trackedQuest none')).toEqual({
            type: 'setTrackedQuest',
            questId: null,
        });
        expect(
            serializeEffect({ type: 'setTrackedQuest', questId: null })
        ).toBe('SET trackedQuest none');
        expect(
            applyEffect({ type: 'setTrackedQuest', questId: 'first' }, state)
                .trackedQuest
        ).toBe('first');
    });

    it('derives all statuses, supports multiple endings, and keeps legacy quests active', () => {
        const content = registry();
        const state = createInitialState();

        expect(getQuestStatus('first', state, content)).toBe('not_started');
        state.questProgress.first = 'started';
        expect(getQuestStatus('first', state, content)).toBe('active');
        state.questProgress.first = 'good_end';
        expect(getQuestStatus('first', state, content)).toBe('complete');
        state.questProgress.first = 'bad_end';
        expect(getQuestStatus('first', state, content)).toBe('complete');
        state.questProgress.second = 'started';
        expect(getQuestStatus('second', state, content)).toBe('active');
    });

    it('orders tracked, active, then completed quests', () => {
        const content = registry();
        const state = createInitialState();
        state.questProgress = {
            third: 'done',
            second: 'started',
            first: 'started',
        };
        state.trackedQuest = 'first';

        expect(buildSnapshot(state, content).quests).toMatchObject([
            { id: 'first', status: 'active', tracked: true },
            { id: 'second', status: 'active', tracked: false },
            { id: 'third', status: 'complete', tracked: false },
        ]);
    });

    it('persists tracking, ignores unstarted quests, and clears on completion', () => {
        const content = registry();
        const state = createInitialState();
        state.questProgress.first = 'started';
        const engine = new Engine(content, state);

        engine.trackQuest('second');
        expect(engine.getState().trackedQuest).toBeNull();

        engine.trackQuest('first');
        const save = engine.saveGame();
        const loaded = new Engine(content);
        loaded.loadGame(save);
        expect(loaded.getState().trackedQuest).toBe('first');

        loaded.applyDebugEffect({
            type: 'setQuestStage',
            questId: 'first',
            stageId: 'good_end',
        });
        expect(loaded.getState().trackedQuest).toBeNull();
    });

    it('loads saves created before quest tracking was added', () => {
        const content = registry();
        const engine = new Engine(content);
        const save = engine.saveGame();
        delete (save.state as Partial<typeof save.state>).trackedQuest;

        const loaded = new Engine(content);
        loaded.loadGame(save);

        expect(loaded.getState().trackedQuest).toBeNull();
    });
});
