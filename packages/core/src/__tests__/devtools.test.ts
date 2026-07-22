import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Engine } from '../engine';
import { enableDevTools } from '../devtools';
import { parseDialogue } from '../parser';
import type { ContentRegistry } from '../types/registry';
import type { GameConfig } from '../types/entities';

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
            keep: {
                id: 'keep',
                name: 'The Keep',
                description: 'A distant keep',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {
            ally: {
                id: 'ally',
                name: 'Ally',
                biography: '',
                portrait: '',
                location: 'tavern',
                dialogue: '',
                stats: {},
            },
            vendor: {
                id: 'vendor',
                name: 'Vendor',
                biography: '',
                portrait: '',
                location: 'tavern',
                dialogue: '',
                stats: {},
            },
        },
        items: {
            coin: {
                id: 'coin',
                name: 'Old Coin',
                description: '',
                icon: '',
                image: '',
                location: 'tavern',
                stats: {},
            },
        },
        maps: {},
        dialogues: {
            greeting: parseDialogue(
                [
                    'NODE start',
                    '  NARRATOR: Hello.',
                    '  CHOICE Bye',
                    '    END dialogue',
                    '  END',
                ].join('\n'),
                'greeting'
            ),
            unavailable: {
                id: 'unavailable',
                startNode: 'missing',
                nodes: [],
            },
        },
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    };
}

const config: GameConfig = {
    startLocation: 'tavern',
    startTime: { day: 2, hour: 9 },
    startFlags: {},
    startVariables: { gold: 5 },
    startInventory: [],
};

describe('browser dev tools', () => {
    let engine: Engine;
    const onUpdate = vi.fn();

    beforeEach(() => {
        engine = new Engine(createRegistry());
        engine.newGame(config);
        engine.applyDebugEffect({ type: 'addToParty', characterId: 'ally' });

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

    it('changes state through the Engine debug API and reports updates', () => {
        const doodle = window.doodle!;

        doodle.setFlag('trusted');
        expect(engine.getState().flags.trusted).toBe(true);
        doodle.clearFlag('trusted');
        expect(engine.getState().flags.trusted).toBe(false);
        doodle.setVariable('gold', 12);
        expect(doodle.getVariable('gold')).toBe(12);
        doodle.setQuestStage('odd_jobs', 'started');
        expect(engine.getState().questProgress.odd_jobs).toBe('started');
        doodle.teleport('keep');
        expect(engine.getState().currentLocation).toBe('keep');
        expect(engine.getState().characterState.ally.location).toBe('keep');
        expect(engine.getState().characterState.vendor.location).toBe('tavern');
        expect(onUpdate).toHaveBeenCalledTimes(5);
    });

    it('adds and removes inventory without duplicating items', () => {
        const doodle = window.doodle!;

        doodle.addItem('coin');
        doodle.addItem('coin');
        expect(engine.getState().inventory).toEqual(['coin']);
        expect(engine.getState().itemLocations.coin).toBe('inventory');
        doodle.removeItem('coin');
        doodle.removeItem('coin');
        expect(engine.getState().inventory).toEqual([]);
        expect(engine.getState().itemLocations.coin).toBeUndefined();
        expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    it('starts valid dialogues and rejects missing or unavailable ones', () => {
        const doodle = window.doodle!;

        doodle.triggerDialogue('missing');
        expect(console.error).toHaveBeenCalledWith(
            '🐾 Dialogue not found: missing'
        );

        doodle.triggerDialogue('unavailable');
        expect(console.error).toHaveBeenCalledWith(
            '🐾 Could not start dialogue: unavailable'
        );

        doodle.triggerDialogue('greeting');
        expect(engine.getState().dialogueState).toEqual({
            dialogueId: 'greeting',
            nodeId: 'start',
        });
        expect(onUpdate).toHaveBeenCalledOnce();
    });

    it('returns copies for inspection and prints a readable summary', () => {
        const doodle = window.doodle!;

        const state = doodle.inspectState();
        state.flags.changedOutsideEngine = true;
        expect(engine.getState().flags.changedOutsideEngine).toBeUndefined();

        const registry = doodle.inspectRegistry();
        registry.locations.tavern.name = 'Changed outside Engine';
        expect(engine.getRegistry().locations.tavern.name).toBe('Tavern');

        doodle.addItem('coin');
        doodle.inspect();
        expect(console.log).toHaveBeenCalledWith('Current Location:', 'Tavern');
        expect(console.log).toHaveBeenCalledWith('Inventory:', ['Old Coin']);
    });
});
