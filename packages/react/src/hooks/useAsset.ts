/**
 * useAsset — hook to get a single asset with loading state.
 * usePrefetch — hook to prefetch assets for upcoming screens.
 */

import { useEffect } from "react";
import { useAssetContext } from "../AssetProvider";

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
 * Returns a usable URL immediately — the asset may still be loading.
 */
export function useAsset(path: string | undefined): UseAssetResult {
  const { state, getAssetUrl, isReady } = useAssetContext();

  if (!path) {
    return { url: "", isReady: false, isLoading: false, error: null };
  }

  const ready = isReady(path);
  const loading =
    !ready &&
    (state.phase === "loading-shell" || state.phase === "loading-game");

  return {
    url: ready ? getAssetUrl(path) : path,
    isReady: ready,
    isLoading: loading,
    error: state.phase === "error" ? state.error : null,
  };
}

/**
 * Hook to prefetch assets that might be needed soon (non-blocking).
 * Useful for prefetching the next location's assets when the player arrives somewhere.
 */
export function usePrefetch(paths: string[]): void {
  const { prefetch } = useAssetContext();

  useEffect(() => {
    if (paths.length > 0) {
      prefetch(paths);
    }
  }, [paths, prefetch]);
}
