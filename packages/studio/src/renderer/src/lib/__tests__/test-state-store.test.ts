import { describe, it, expect, beforeEach } from 'vitest';
import type { NamedTestState } from '../playtest';
import {
    testStateKey,
    readTestStates,
    writeTestStates,
    upsertTestState,
    removeTestState,
} from '../test-state-store';

// Minimal in-memory localStorage so the store's persistence is testable in the
// default (node) test environment.
function installLocalStorage() {
    const map = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => void map.set(k, v),
        removeItem: (k) => void map.delete(k),
        clear: () => map.clear(),
        key: (i) => [...map.keys()][i] ?? null,
        get length() {
            return map.size;
        },
    } satisfies Storage;
}

function state(name: string, flag: string): NamedTestState {
    return {
        name,
        save: {
            version: '1.0',
            timestamp: '2026-01-01T00:00:00.000Z',
            // Only the fields the test inspects; the store treats save as opaque.
            state: { flags: { [flag]: true } } as never,
        },
    };
}

describe('test-state-store', () => {
    beforeEach(installLocalStorage);

    it('scopes the storage key to the project', () => {
        expect(testStateKey('/a/proj')).not.toBe(testStateKey('/b/proj'));
    });

    it('round-trips saved states through localStorage', () => {
        const key = testStateKey('/proj');
        const states = [state('one', 'a'), state('two', 'b')];
        writeTestStates(key, states);
        expect(readTestStates(key)).toEqual(states);
    });

    it('returns an empty list for missing or malformed storage', () => {
        const key = testStateKey('/proj');
        expect(readTestStates(key)).toEqual([]);
        localStorage.setItem(key, '{not json');
        expect(readTestStates(key)).toEqual([]);
    });

    it('upsert replaces a state with the same name rather than duplicating', () => {
        const first = [state('save', 'a')];
        const next = upsertTestState(first, state('save', 'b'));
        expect(next).toHaveLength(1);
        expect(next[0].save.state).toMatchObject({ flags: { b: true } });
    });

    it('remove drops a state by name', () => {
        const states = [state('one', 'a'), state('two', 'b')];
        expect(removeTestState(states, 'one')).toEqual([state('two', 'b')]);
    });

    it('keeps two projects independent', () => {
        writeTestStates(testStateKey('/a'), [state('x', 'a')]);
        writeTestStates(testStateKey('/b'), [state('y', 'b')]);
        expect(readTestStates(testStateKey('/a'))).toEqual([state('x', 'a')]);
        expect(readTestStates(testStateKey('/b'))).toEqual([state('y', 'b')]);
    });
});
