// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { AssetLoader, AssetManifest } from '@doodle-engine/core';
import { AssetProvider } from '../AssetProvider';

afterEach(cleanup);

const manifest: AssetManifest = {
    version: 'test',
    shell: [{ path: '/shell.png', type: 'image', size: 10, tier: 1 }],
    game: [{ path: '/game.png', type: 'image', size: 30, tier: 2 }],
    shellSize: 10,
    totalSize: 40,
};

function makeLoader(loadMany: AssetLoader['loadMany']): AssetLoader {
    return {
        isAvailable: vi.fn(async () => true),
        load: vi.fn(async () => {}),
        loadMany,
        clear: vi.fn(async () => {}),
    };
}

function Consumer() {
    return <p>Game loaded</p>;
}

describe('AssetProvider', () => {
    it('loads shell and game assets in order before rendering children', async () => {
        const states: string[] = [];
        const loadMany = vi.fn<AssetLoader['loadMany']>(
            async (paths, onProgress) => {
                onProgress?.(paths.length, paths.length, paths[0] ?? '');
            }
        );
        const loader = makeLoader(loadMany);
        render(
            <AssetProvider
                manifest={manifest}
                loader={loader}
                onStateChange={(state) => states.push(state.phase)}
                renderLoading={(state) => <p>Loading: {state.phase}</p>}
            >
                <Consumer />
            </AssetProvider>
        );

        expect(await screen.findByText('Game loaded')).toBeTruthy();
        expect(loadMany.mock.calls.map(([paths]) => paths)).toEqual([
            ['/shell.png'],
            ['/game.png'],
        ]);
        expect(states).toContain('loading-shell');
        expect(states).toContain('loading-game');
        expect(states.at(-1)).toBe('complete');

    });

    it('renders the failed state and does not expose children', async () => {
        const loader = makeLoader(
            vi.fn(async () => {
                throw new Error('network unavailable');
            })
        );

        render(
            <AssetProvider
                manifest={manifest}
                loader={loader}
                renderLoading={(state) => (
                    <p>{state.error ?? `Loading: ${state.phase}`}</p>
                )}
            >
                <p>Game loaded</p>
            </AssetProvider>
        );

        expect(await screen.findByText('network unavailable')).toBeTruthy();
        expect(screen.queryByText('Game loaded')).toBeNull();
    });

    it('supports an empty manifest without stalling', async () => {
        const loader = makeLoader(vi.fn(async () => {}));
        render(
            <AssetProvider
                manifest={{
                    version: 'empty',
                    shell: [],
                    game: [],
                    shellSize: 0,
                    totalSize: 0,
                }}
                loader={loader}
            >
                <p>Ready</p>
            </AssetProvider>
        );

        await waitFor(() => expect(screen.getByText('Ready')).toBeTruthy());
    });

    it('can hold the completed loading UI until the shell continues', async () => {
        const loader = makeLoader(vi.fn(async () => {}));
        const view = render(
            <AssetProvider
                manifest={{
                    version: 'fast',
                    shell: [],
                    game: [],
                    shellSize: 0,
                    totalSize: 0,
                }}
                loader={loader}
                readyToContinue={false}
                renderLoading={(state) => <p>Loading: {state.phase}</p>}
            >
                <p>Fast game ready</p>
            </AssetProvider>
        );

        expect(await screen.findByText('Loading: complete')).toBeTruthy();
        expect(screen.queryByText('Fast game ready')).toBeNull();

        view.rerender(
            <AssetProvider
                manifest={{
                    version: 'fast',
                    shell: [],
                    game: [],
                    shellSize: 0,
                    totalSize: 0,
                }}
                loader={loader}
                readyToContinue
                renderLoading={(state) => <p>Loading: {state.phase}</p>}
            >
                <p>Fast game ready</p>
            </AssetProvider>
        );
        expect(await screen.findByText('Fast game ready')).toBeTruthy();
    });
});
