/**
 * Save-slot storage helpers.
 *
 * Saves are kept as a list of slots under a single storage key. There are three
 * kinds:
 *   - 'quick'  : a single quick-save slot; saving again overwrites it.
 *   - 'auto'   : a single autosave slot; written automatically, overwrites.
 *   - 'manual' : as many as the player makes; each Save adds a new one.
 *
 * These functions are pure over a small storage interface (localStorage
 * satisfies it), so they can be unit-tested without a browser.
 */

import type { SaveData } from '@doodle-engine/core';

/** The part of localStorage these helpers use. */
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/** Which kind of save a slot is. */
export type SaveKind = 'quick' | 'auto' | 'manual';

/** One saved game in the list. */
export interface SaveSlot {
    /** Unique id for this slot. */
    id: string;
    /** quick, auto, or manual. */
    kind: SaveKind;
    /** Human-readable label shown in the save list. */
    label: string;
    /** ISO timestamp of when the save was written. */
    timestamp: string;
    /** The engine save data. */
    save: SaveData;
}

/** Options for writing a save. Mainly for tests and custom labels. */
export interface WriteSaveOptions {
    label?: string;
    id?: string;
    timestamp?: string;
}

const KIND_ORDER: Record<SaveKind, number> = { quick: 0, auto: 1, manual: 2 };
const LEGACY_SHARED_KEY = 'doodle-engine-save';
const PROJECT_ID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAVE_STORAGE_KEY_PATTERN =
    /^doodle-engine-save:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare const saveStorageKeyBrand: unique symbol;
/** A validated save namespace derived from one stable project ID. */
export type SaveStorageKey = string & {
    readonly [saveStorageKeyBrand]: true;
};

/**
 * Reject missing and shared keys before they can reach browser storage.
 * Low-level TypeScript callers also receive this requirement through the
 * branded SaveStorageKey type.
 */
export function assertSaveStorageKey(
    key: unknown
): asserts key is SaveStorageKey {
    if (typeof key !== 'string' || !SAVE_STORAGE_KEY_PATTERN.test(key)) {
        throw new Error(
            'Save helpers require a key created by saveStorageKeyForProject(projectId). Shared or hand-written keys are not accepted.'
        );
    }
}

/** Build the private save namespace for one generated project identity. */
export function saveStorageKeyForProject(projectId: unknown): SaveStorageKey {
    if (typeof projectId !== 'string' || !PROJECT_ID_PATTERN.test(projectId)) {
        throw new Error(
            'Doodle save components require the stable project ID created with the project. It must be a UUID and must not change between releases.'
        );
    }
    return `${LEGACY_SHARED_KEY}:${projectId}` as SaveStorageKey;
}

function readSlots(storage: SaveStorage, key: SaveStorageKey): SaveSlot[] {
    assertSaveStorageKey(key);
    const raw = storage.getItem(key);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            // Tolerate slots written before "kind" existed.
            return (parsed as SaveSlot[]).map((slot) => ({
                ...slot,
                kind: slot.kind ?? 'manual',
            }));
        }
        // A single legacy save (raw SaveData) becomes one manual slot.
        if (parsed && typeof parsed === 'object' && 'state' in parsed) {
            const save = parsed as SaveData;
            return [
                {
                    id: 'legacy',
                    kind: 'manual',
                    label: defaultLabel(save, 'manual'),
                    timestamp: save.timestamp ?? '',
                    save,
                },
            ];
        }
        return [];
    } catch {
        return [];
    }
}

function writeSlots(
    storage: SaveStorage,
    key: SaveStorageKey,
    slots: SaveSlot[]
): void {
    assertSaveStorageKey(key);
    storage.setItem(key, JSON.stringify(slots));
}

function defaultLabel(save: SaveData, kind: SaveKind): string {
    if (kind === 'quick') return 'Quick Save';
    if (kind === 'auto') return 'Autosave';
    const day = save.state?.currentTime?.day;
    return typeof day === 'number' ? `Day ${day}` : 'Save';
}

/**
 * All saves, ordered for display: quick first, then autosave, then manual
 * saves newest first.
 */
export function listSaves(
    storage: SaveStorage,
    key: SaveStorageKey
): SaveSlot[] {
    return readSlots(storage, key)
        .slice()
        .sort((a, b) => {
            if (a.kind !== b.kind)
                return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
            return a.timestamp < b.timestamp ? 1 : -1;
        });
}

/** True if there is at least one save. */
export function hasSaves(storage: SaveStorage, key: SaveStorageKey): boolean {
    return readSlots(storage, key).length > 0;
}

/**
 * Write a save and return its slot.
 *
 * A 'quick' or 'auto' save overwrites the existing one of that kind. A 'manual'
 * save is added to the list.
 */
export function writeSave(
    storage: SaveStorage,
    key: SaveStorageKey,
    save: SaveData,
    kind: SaveKind = 'manual',
    options: WriteSaveOptions = {}
): SaveSlot {
    const timestamp =
        options.timestamp ?? save.timestamp ?? new Date().toISOString();
    const id =
        options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const label = options.label ?? defaultLabel(save, kind);

    const slot: SaveSlot = { id, kind, label, timestamp, save };

    // Quick and autosave keep a single slot; manual saves accumulate.
    const existing =
        kind === 'manual'
            ? readSlots(storage, key)
            : readSlots(storage, key).filter((s) => s.kind !== kind);
    existing.push(slot);
    writeSlots(storage, key, existing);
    return slot;
}

/** Remove a save slot by id. */
export function deleteSave(
    storage: SaveStorage,
    key: SaveStorageKey,
    id: string
): void {
    writeSlots(
        storage,
        key,
        readSlots(storage, key).filter((slot) => slot.id !== id)
    );
}

/** Get one save's data by id, or null if it is gone. */
export function loadSave(
    storage: SaveStorage,
    key: SaveStorageKey,
    id: string
): SaveData | null {
    const slot = readSlots(storage, key).find((s) => s.id === id);
    return slot ? slot.save : null;
}

/** The most recent save by time (any kind), or null if there are none. */
export function latestSave(
    storage: SaveStorage,
    key: SaveStorageKey
): SaveData | null {
    const slots = readSlots(storage, key);
    if (slots.length === 0) return null;
    return slots.reduce((newest, slot) =>
        slot.timestamp > newest.timestamp ? slot : newest
    ).save;
}
