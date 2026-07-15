// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { AssetContextValue } from '../AssetProvider';
import { AssetContext } from '../AssetProvider';
import { useAsset, usePrefetch } from '../hooks/useAsset';

afterEach(cleanup);

function Probe({
    path,
    prefetch = [],
}: {
    path?: string;
    prefetch?: string[];
}) {
    const asset = useAsset(path);
    usePrefetch(prefetch);
    return (
        <output>
            {asset.url}|{String(asset.isReady)}|{String(asset.isLoading)}|
            {asset.error ?? ''}
        </output>
    );
}

function context(
    overrides: Partial<AssetContextValue> = {}
): AssetContextValue {
    return {
        state: {
            phase: 'loading-game',
            bytesLoaded: 0,
            bytesTotal: 1,
            assetsLoaded: 0,
            assetsTotal: 1,
            progress: 0,
            overallProgress: 0,
            currentAsset: '/image.png',
            error: null,
        },
        getAssetUrl: (path) => `/cached${path}`,
        isReady: () => false,
        prefetch: vi.fn(),
        loader: {} as AssetContextValue['loader'],
        ...overrides,
    };
}

describe('asset hooks', () => {
    it('handles absent paths and paths outside a provider', () => {
        const { rerender } = render(<Probe />);
        expect(screen.getByText('|false|false|')).toBeTruthy();
        rerender(<Probe path="/plain.png" />);
        expect(screen.getByText('/plain.png|true|false|')).toBeTruthy();
    });

    it('reports loading, ready, and failed provider states', () => {
        const value = context();
        const { rerender } = render(
            <AssetContext.Provider value={value}>
                <Probe path="/image.png" />
            </AssetContext.Provider>
        );
        expect(screen.getByText('/image.png|false|true|')).toBeTruthy();

        const ready = context({
            state: { ...value.state, phase: 'complete' },
            isReady: () => true,
        });
        rerender(
            <AssetContext.Provider value={ready}>
                <Probe path="/image.png" />
            </AssetContext.Provider>
        );
        expect(screen.getByText('/cached/image.png|true|false|')).toBeTruthy();

        const failed = context({
            state: { ...value.state, phase: 'error', error: 'broken asset' },
        });
        rerender(
            <AssetContext.Provider value={failed}>
                <Probe path="/image.png" />
            </AssetContext.Provider>
        );
        expect(
            screen.getByText('/image.png|false|false|broken asset')
        ).toBeTruthy();
    });

    it('prefetches nonempty lists only when a provider exists', () => {
        const value = context();
        const { rerender } = render(
            <AssetContext.Provider value={value}>
                <Probe prefetch={['/next.png']} />
            </AssetContext.Provider>
        );
        expect(value.prefetch).toHaveBeenCalledWith(['/next.png']);

        rerender(
            <AssetContext.Provider value={value}>
                <Probe prefetch={[]} />
            </AssetContext.Provider>
        );
        expect(value.prefetch).toHaveBeenCalledOnce();
    });
});
