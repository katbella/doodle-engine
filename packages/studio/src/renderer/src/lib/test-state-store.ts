/**
 * Pure read/write for named playtest test states in localStorage.
 *
 * Kept separate from the React hook so the persistence rules (per-project key,
 * dedup by name, tolerate malformed storage) are testable without a DOM. States
 * live in Studio's own app data (localStorage), never in the project.
 */
import type { NamedTestState } from './playtest';

/** The storage key for a project's saved test states. */
export function testStateKey(projectKey: string): string {
    return `doodle-studio-teststates:${projectKey}`;
}

/** Read a project's saved states, returning [] for missing or malformed data. */
export function readTestStates(storageKey: string): NamedTestState[] {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as NamedTestState[]) : [];
    } catch {
        return [];
    }
}

/** Persist a project's saved states. */
export function writeTestStates(
    storageKey: string,
    states: NamedTestState[]
): void {
    localStorage.setItem(storageKey, JSON.stringify(states));
}

/** Add or replace a state by name (names are unique within a project). */
export function upsertTestState(
    states: NamedTestState[],
    state: NamedTestState
): NamedTestState[] {
    return [...states.filter((s) => s.name !== state.name), state];
}

/** Remove a state by name. */
export function removeTestState(
    states: NamedTestState[],
    name: string
): NamedTestState[] {
    return states.filter((s) => s.name !== name);
}
