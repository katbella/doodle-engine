import { useCallback, useState } from 'react';
import type { NamedTestState } from './playtest';
import {
    testStateKey,
    readTestStates,
    writeTestStates,
    upsertTestState,
    removeTestState,
} from './test-state-store';

/**
 * Named playtest test states, persisted per project in localStorage so they
 * survive dock-tab switches and app restarts. Keyed by the project path, and
 * stored in Studio's own app data — never in the project itself.
 */
export function useTestStates(projectKey: string): {
    states: NamedTestState[];
    save: (state: NamedTestState) => void;
    remove: (name: string) => void;
} {
    const storageKey = testStateKey(projectKey);

    const [states, setStates] = useState<NamedTestState[]>(() =>
        readTestStates(storageKey)
    );

    const persist = useCallback(
        (next: NamedTestState[]) => {
            setStates(next);
            writeTestStates(storageKey, next);
        },
        [storageKey]
    );

    const save = useCallback(
        (state: NamedTestState) =>
            persist(upsertTestState(readTestStates(storageKey), state)),
        [persist, storageKey]
    );

    const remove = useCallback(
        (name: string) =>
            persist(removeTestState(readTestStates(storageKey), name)),
        [persist, storageKey]
    );

    return { states, save, remove };
}
