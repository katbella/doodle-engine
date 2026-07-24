// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudioApi, StudioUpdateState } from '../../../../shared/project';
import { useStudioUpdater } from '../useStudioUpdater';

afterEach(cleanup);

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

describe('useStudioUpdater', () => {
    it('does not let an older initial snapshot replace a newer event', async () => {
        const initial = deferred<StudioUpdateState>();
        const unsubscribe = vi.fn();
        let publish!: (state: StudioUpdateState) => void;
        const studio = {
            getStudioUpdateState: vi.fn(() => initial.promise),
            onStudioUpdateState: vi.fn((callback) => {
                publish = callback;
                return unsubscribe;
            }),
        } as unknown as StudioApi;
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: studio,
        });

        const { result, unmount } = renderHook(() => useStudioUpdater());
        const available: StudioUpdateState = {
            status: 'available',
            currentVersion: '0.2.0',
            manual: false,
            version: '0.3.0',
            releaseNotes: null,
            platform: 'windows',
        };
        act(() => publish(available));
        expect(result.current.state).toEqual(available);
        expect(result.current.open).toBe(true);

        await act(async () => {
            initial.resolve({
                status: 'checking',
                currentVersion: '0.2.0',
                manual: false,
            });
            await initial.promise;
        });
        expect(result.current.state).toEqual(available);

        unmount();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
