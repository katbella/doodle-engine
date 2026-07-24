/**
 * Tests for the save-slot helpers (quick, auto, manual).
 */

import { describe, expect, it } from 'vitest';
import type { SaveData } from '@doodle-engine/core';
import {
    listSaves,
    hasSaves,
    writeSave,
    deleteSave,
    loadSave,
    latestSave,
    saveStorageKeyForProject,
    type SaveStorage,
} from '../saves';

function makeStorage(): SaveStorage {
    const map = new Map<string, string>();
    return {
        getItem: (key) => (map.has(key) ? map.get(key)! : null),
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

function makeSave(day: number, timestamp: string): SaveData {
    return {
        version: '1.0',
        timestamp,
        state: { currentTime: { day, hour: 0 } } as any,
    };
}

const FIRST_PROJECT_ID = '00000000-0000-4000-8000-000000000004';
const SECOND_PROJECT_ID = '00000000-0000-4000-8000-000000000005';
const KEY = saveStorageKeyForProject(FIRST_PROJECT_ID);

describe('save slots', () => {
    it('starts empty', () => {
        const storage = makeStorage();
        expect(hasSaves(storage, KEY)).toBe(false);
        expect(listSaves(storage, KEY)).toEqual([]);
        expect(latestSave(storage, KEY)).toBeNull();
    });

    it('writes a manual save labeled by day', () => {
        const storage = makeStorage();
        const slot = writeSave(storage, KEY, makeSave(1, 't1'), 'manual', {
            id: 'a',
        });

        expect(slot.kind).toBe('manual');
        expect(slot.label).toBe('Day 1');
        expect(hasSaves(storage, KEY)).toBe(true);
    });

    it('keeps games with different storage keys isolated', () => {
        const storage = makeStorage();
        const secondKey = saveStorageKeyForProject(SECOND_PROJECT_ID);
        writeSave(storage, KEY, makeSave(1, '2026-01-01'), 'manual', {
            id: 'first',
        });

        expect(listSaves(storage, KEY).map((slot) => slot.id)).toEqual([
            'first',
        ]);
        expect(listSaves(storage, secondKey)).toEqual([]);
    });

    it('rejects missing, shared, and hand-written storage keys', () => {
        const storage = makeStorage();
        for (const key of [
            undefined,
            '',
            'doodle-engine-save',
            'doodle-engine-save:first-game',
        ]) {
            expect(() => listSaves(storage, key as never)).toThrowError(
                /saveStorageKeyForProject/
            );
        }
    });

    it('rejects missing or malformed project identities', () => {
        for (const projectId of [
            undefined,
            '',
            'first-game',
            '00000000-0000-1000-8000-000000000004',
        ]) {
            expect(() => saveStorageKeyForProject(projectId)).toThrowError(
                /stable project ID/
            );
        }
    });

    it('keeps multiple manual saves, newest first', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, '2026-01-01'), 'manual', {
            id: 'a',
        });
        writeSave(storage, KEY, makeSave(2, '2026-01-02'), 'manual', {
            id: 'b',
        });

        expect(listSaves(storage, KEY).map((s) => s.id)).toEqual(['b', 'a']);
    });

    it('overwrites the single quick save', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, 't1'), 'quick', { id: 'q1' });
        writeSave(storage, KEY, makeSave(2, 't2'), 'quick', { id: 'q2' });

        const quicks = listSaves(storage, KEY).filter(
            (s) => s.kind === 'quick'
        );
        expect(quicks).toHaveLength(1);
        expect(quicks[0].id).toBe('q2');
        expect(quicks[0].label).toBe('Quick Save');
    });

    it('overwrites the single autosave', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, 't1'), 'auto', { id: 'a1' });
        writeSave(storage, KEY, makeSave(2, 't2'), 'auto', { id: 'a2' });

        const autos = listSaves(storage, KEY).filter((s) => s.kind === 'auto');
        expect(autos).toHaveLength(1);
        expect(autos[0].id).toBe('a2');
        expect(autos[0].label).toBe('Autosave');
    });

    it('orders the list quick, then auto, then manual newest first', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, '2026-01-01'), 'manual', {
            id: 'm1',
        });
        writeSave(storage, KEY, makeSave(2, '2026-01-02'), 'manual', {
            id: 'm2',
        });
        writeSave(storage, KEY, makeSave(3, '2026-01-03'), 'auto', {
            id: 'auto',
        });
        writeSave(storage, KEY, makeSave(4, '2026-01-04'), 'quick', {
            id: 'quick',
        });

        expect(listSaves(storage, KEY).map((s) => s.id)).toEqual([
            'quick',
            'auto',
            'm2',
            'm1',
        ]);
    });

    it('latestSave returns the newest by time, any kind', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, '2026-01-01'), 'manual', {
            id: 'm',
        });
        writeSave(storage, KEY, makeSave(9, '2026-01-09'), 'quick', {
            id: 'q',
        });

        expect(latestSave(storage, KEY)?.state.currentTime.day).toBe(9);
    });

    it('loads and deletes by id', () => {
        const storage = makeStorage();
        writeSave(storage, KEY, makeSave(1, 't1'), 'manual', { id: 'a' });
        writeSave(storage, KEY, makeSave(2, 't2'), 'manual', { id: 'b' });

        expect(loadSave(storage, KEY, 'a')?.state.currentTime.day).toBe(1);
        expect(loadSave(storage, KEY, 'missing')).toBeNull();

        deleteSave(storage, KEY, 'a');
        expect(listSaves(storage, KEY).map((s) => s.id)).toEqual(['b']);
    });

    it('reads a single legacy save as one manual slot', () => {
        const storage = makeStorage();
        storage.setItem(KEY, JSON.stringify(makeSave(3, 't3')));

        const slots = listSaves(storage, KEY);
        expect(slots).toHaveLength(1);
        expect(slots[0].kind).toBe('manual');
        expect(slots[0].save.state.currentTime.day).toBe(3);
    });
});
