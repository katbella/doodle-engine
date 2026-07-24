import { useCallback, useState } from 'react';

/** A number persisted to localStorage, for remembering a resized panel size. */
export function usePersistedSize(
    key: string,
    initial: number
): [number, (value: number) => void] {
    const [size, setSize] = useState(() => {
        const stored = localStorage.getItem(key);
        const n = stored === null ? NaN : Number(stored);
        return Number.isFinite(n) ? n : initial;
    });

    const set = useCallback(
        (value: number) => {
            setSize(value);
            localStorage.setItem(key, String(value));
        },
        [key]
    );

    return [size, set];
}
