import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine } from '../engine';
import { enableDevTools } from '../devtools';

describe('browser dev tools', () => {
    const state = {
        currentLocation: 'tavern',
        currentTime: { day: 2, hour: 9 },
        flags: {} as Record<string, boolean>,
        variables: { gold: 5 } as Record<string, number | string>,
        inventory: [] as string[],
        questProgress: {} as Record<string, string>,
        characterState: {
            ally: { inParty: true, location: 'tavern' },
            vendor: { inParty: false, location: 'market' },
        },
        itemLocations: {} as Record<string, string>,
    };
    const registry = {
        dialogues: { greeting: { id: 'greeting' } },
    };
    const enterDialogue = vi.fn(() => true);
    const getSnapshot = vi.fn(() => ({
        location: { name: 'Tavern' },
        time: state.currentTime,
        inventory: state.inventory.map((id) => ({ id, name: id })),
    }));
    const engine = {
        state,
        registry,
        enterDialogue,
        getSnapshot,
    } as unknown as Engine;
    const onUpdate = vi.fn();

    beforeEach(() => {
        state.currentLocation = 'tavern';
        state.flags = {};
        state.variables = { gold: 5 };
        state.inventory = [];
        state.questProgress = {};
        state.characterState.ally = { inParty: true, location: 'tavern' };
        state.characterState.vendor = { inParty: false, location: 'market' };
        state.itemLocations = {};
        enterDialogue.mockReset().mockReturnValue(true);
        getSnapshot.mockClear();
        onUpdate.mockClear();
        vi.stubGlobal('window', {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        enableDevTools(engine, onUpdate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('mutates flags, variables, quests, and locations and reports updates', () => {
        const doodle = window.doodle!;

        doodle.setFlag('trusted');
        expect(state.flags.trusted).toBe(true);
        doodle.clearFlag('trusted');
        expect(state.flags.trusted).toBeUndefined();
        doodle.setVariable('gold', 12);
        expect(doodle.getVariable('gold')).toBe(12);
        doodle.setQuestStage('odd_jobs', 'started');
        expect(state.questProgress.odd_jobs).toBe('started');
        doodle.teleport('keep');
        expect(state.currentLocation).toBe('keep');
        expect(state.characterState.ally.location).toBe('keep');
        expect(state.characterState.vendor.location).toBe('market');
        expect(onUpdate).toHaveBeenCalledTimes(5);
    });

    it('adds and removes inventory without duplicating items', () => {
        const doodle = window.doodle!;

        doodle.addItem('coin');
        doodle.addItem('coin');
        expect(state.inventory).toEqual(['coin']);
        expect(state.itemLocations.coin).toBe('inventory');
        doodle.removeItem('coin');
        doodle.removeItem('coin');
        expect(state.inventory).toEqual([]);
        expect(state.itemLocations.coin).toBeUndefined();
        expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    it('starts valid dialogues and rejects missing or unavailable ones', () => {
        const doodle = window.doodle!;

        doodle.triggerDialogue('missing');
        expect(console.error).toHaveBeenCalledWith(
            '🐾 Dialogue not found: missing'
        );
        enterDialogue.mockReturnValueOnce(false);
        doodle.triggerDialogue('greeting');
        expect(console.error).toHaveBeenCalledWith(
            '🐾 Could not start dialogue: greeting'
        );
        doodle.triggerDialogue('greeting');
        expect(enterDialogue).toHaveBeenCalledWith('greeting');
        expect(onUpdate).toHaveBeenCalledOnce();
    });

    it('exposes state, registry, and a readable inspection summary', () => {
        const doodle = window.doodle!;

        expect(doodle.inspectState()).toBe(state);
        expect(doodle.inspectRegistry()).toBe(registry);
        doodle.addItem('coin');
        doodle.inspect();
        expect(getSnapshot).toHaveBeenCalledOnce();
        expect(console.log).toHaveBeenCalledWith('Current Location:', 'Tavern');
        expect(console.log).toHaveBeenCalledWith('Inventory:', ['coin']);
    });
});
