// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssetLoader, AssetManifest } from '@doodle-engine/core';
import {
    AssetProvider,
    useAssetContext,
    useOptionalAssetContext,
} from '../AssetProvider';

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
        getUrl: vi.fn((path: string) => `/cached${path}`),
        prefetch: vi.fn(),
        clear: vi.fn(async () => {}),
    };
}

function Consumer() {
    const assets = useAssetContext();
    return (
        <div>
            <span>{assets.state.phase}</span>
            <span>{assets.getAssetUrl('/game.png')}</span>
            <span>{assets.isReady('/shell.png') ? 'shell-ready' : ''}</span>
            <span>{assets.isReady('/game.png') ? 'game-ready' : ''}</span>
            <button onClick={() => assets.prefetch(['/next.png'])}>
                Prefetch
            </button>
        </div>
    );
}

describe('AssetProvider', () => {
    it('loads shell and game assets in order and exposes completed assets', async () => {
        const states: string[] = [];
        const loadMany = vi.fn<AssetLoader['loadMany']>(
            async (paths, onProgress) => {
                onProgress?.(paths.length, paths.length, paths[0] ?? '');
            }
        );
        const loader = makeLoader(loadMany);
        const user = userEvent.setup();

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

        expect(await screen.findByText('/cached/game.png')).toBeTruthy();
        expect(screen.getByText('shell-ready')).toBeTruthy();
        expect(screen.getByText('game-ready')).toBeTruthy();
        expect(loadMany.mock.calls.map(([paths]) => paths)).toEqual([
            ['/shell.png'],
            ['/game.png'],
        ]);
        expect(states).toContain('loading-shell');
        expect(states).toContain('loading-game');
        expect(states.at(-1)).toBe('complete');

        await user.click(screen.getByRole('button', { name: 'Prefetch' }));
        expect(loader.prefetch).toHaveBeenCalledWith(['/next.png']);
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

    it('distinguishes optional access from required access', () => {
        function OptionalConsumer() {
            return <p>{useOptionalAssetContext() ? 'present' : 'absent'}</p>;
        }
        expect(() => render(<Consumer />)).toThrow(
            'useAssetContext must be used within AssetProvider'
        );
        cleanup();
        render(<OptionalConsumer />);
        expect(screen.getByText('absent')).toBeTruthy();
    });
});
