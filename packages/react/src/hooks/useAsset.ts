/**
 * useAsset: hook to get a single asset with loading state.
 * usePrefetch: hook to prefetch assets for upcoming screens.
 */

import { useEffect } from 'react';
import { useOptionalAssetContext } from '../AssetProvider';

export interface UseAssetResult {
    /** URL to use in src / backgroundImage (returns the path directly) */
    url: string;
    /** Whether the asset is fully loaded and cached */
    isReady: boolean;
    /** Whether the asset is actively loading */
    isLoading: boolean;
    /** Error if loading failed */
    error: string | null;
}

/**
 * Hook to get a single asset's loading state.
 * Returns a usable URL immediately. The asset may still be loading.
 */
export function useAsset(path: string | undefined): UseAssetResult {
    const assetContext = useOptionalAssetContext();

    if (!path) {
        return { url: '', isReady: false, isLoading: false, error: null };
    }

    if (!assetContext) {
        return { url: path, isReady: true, isLoading: false, error: null };
    }

    const { state, getAssetUrl, isReady } = assetContext;
    const ready = isReady(path);
    const loading =
        !ready &&
        (state.phase === 'loading-shell' || state.phase === 'loading-game');

    return {
        url: ready ? getAssetUrl(path) : path,
        isReady: ready,
        isLoading: loading,
        error: state.phase === 'error' ? state.error : null,
    };
}

export function useAssetUrl(path: string | undefined): string {
    return useAsset(path).url;
}

/**
 * Hook to prefetch assets that might be needed soon (non-blocking).
 * Useful for prefetching the next location's assets when the player arrives somewhere.
 */
export function usePrefetch(paths: string[]): void {
    const assetContext = useOptionalAssetContext();

    useEffect(() => {
        if (assetContext && paths.length > 0) {
            assetContext.prefetch(paths);
        }
    }, [paths, assetContext]);
}
