/**
 * AssetProvider: context and loading orchestration for the asset system.
 *
 * Manages the two-tier loading flow:
 *   loading-shell, then loading-game, then complete
 *
 * Children don't render until shell and game assets are loaded.
 * Use renderLoading to provide a loading screen during the process.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from 'react';
import type { ReactNode } from 'react';
import type {
    AssetManifest,
    AssetLoadingState,
    AssetLoader,
    AssetEntry,
} from '@doodle-engine/core';
import { createAssetLoader } from '@doodle-engine/core';

export interface AssetContextValue {
    /** Current loading state */
    state: AssetLoadingState;
    /** Get URL for an asset (returns the path, cached by the loader) */
    getAssetUrl: (path: string) => string;
    /** Check if a specific asset is ready */
    isReady: (path: string) => boolean;
    /** Prefetch assets for upcoming content */
    prefetch: (paths: string[]) => void;
    /** The underlying loader instance */
    loader: AssetLoader;
}

export const AssetContext = createContext<AssetContextValue | null>(null);

export function useAssetContext(): AssetContextValue {
    const ctx = useContext(AssetContext);
    if (!ctx)
        throw new Error('useAssetContext must be used within AssetProvider');
    return ctx;
}

export function useOptionalAssetContext(): AssetContextValue | null {
    return useContext(AssetContext);
}

export interface AssetProviderProps {
    /** Asset manifest (from api/manifest or bundled) */
    manifest: AssetManifest;
    /** Children to render once shell and game assets are loaded */
    children: ReactNode;
    /** Custom loader (for non-browser environments) */
    loader?: AssetLoader;
    /** Called when loading state changes */
    onStateChange?: (state: AssetLoadingState) => void;
    /** Render prop for loading screen, receives state for progress display */
    renderLoading?: (state: AssetLoadingState) => ReactNode;
}

const IDLE_STATE: AssetLoadingState = {
    phase: 'idle',
    bytesLoaded: 0,
    bytesTotal: 0,
    assetsLoaded: 0,
    assetsTotal: 0,
    progress: 0,
    overallProgress: 0,
    currentAsset: null,
    error: null,
};

export function AssetProvider({
    manifest,
    children,
    loader: loaderProp,
    onStateChange,
    renderLoading,
}: AssetProviderProps) {
    const loaderRef = useRef<AssetLoader>(
        loaderProp ?? createAssetLoader(manifest.version)
    );
    const loader = loaderRef.current;

    const [state, setStateInternal] = useState<AssetLoadingState>(IDLE_STATE);
    const [allDone, setAllDone] = useState(false);
    const [readyPaths, setReadyPaths] = useState<Set<string>>(new Set());

    const setState = useCallback(
        (next: AssetLoadingState) => {
            setStateInternal(next);
            onStateChange?.(next);
        },
        [onStateChange]
    );

    useEffect(() => {
        let cancelled = false;

        const bytesFor = (entries: AssetEntry[], loaded: number) =>
            entries
                .slice(0, loaded)
                .reduce((sum, entry) => sum + (entry.size ?? 0), 0);

        const bytesTotalFor = (entries: AssetEntry[]) =>
            entries.reduce((sum, entry) => sum + (entry.size ?? 0), 0);

        const phaseProgress = (
            bytesLoaded: number,
            bytesTotal: number,
            assetsLoaded: number,
            assetsTotal: number
        ) => {
            if (bytesTotal > 0) {
                return bytesLoaded / bytesTotal;
            }
            return assetsTotal > 0 ? assetsLoaded / assetsTotal : 1;
        };

        async function load() {
            setAllDone(false);
            const shellEntries = manifest.shell;
            const gameEntries = manifest.game;
            const shellPaths = shellEntries.map((e) => e.path);
            const gamePaths = gameEntries.map((e) => e.path);
            const shellBytesTotal = bytesTotalFor(shellEntries);
            const gameBytesTotal = bytesTotalFor(gameEntries);

            // ── Phase: loading-shell ──────────────────────────────────────
            setState({
                phase: 'loading-shell',
                bytesLoaded: 0,
                bytesTotal: shellBytesTotal,
                assetsLoaded: 0,
                assetsTotal: shellEntries.length,
                progress: 0,
                overallProgress: 0,
                currentAsset: shellPaths[0] ?? null,
                error: null,
            });

            try {
                await loader.loadMany(shellPaths, (loaded, _total, current) => {
                    if (cancelled) return;
                    const bytesLoaded = bytesFor(shellEntries, loaded);
                    const progress = phaseProgress(
                        bytesLoaded,
                        shellBytesTotal,
                        loaded,
                        _total
                    );
                    setState({
                        phase: 'loading-shell',
                        bytesLoaded,
                        bytesTotal: shellBytesTotal,
                        assetsLoaded: loaded,
                        assetsTotal: _total,
                        progress,
                        overallProgress: progress * 0.3, // shell = first 30% of overall
                        currentAsset: current,
                        error: null,
                    });
                });

                if (cancelled) return;

                setReadyPaths((prev) => {
                    const next = new Set(prev);
                    shellPaths.forEach((p) => next.add(p));
                    return next;
                });

                // ── Phase: loading-game ───────────────────────────────────────
                setState({
                    phase: 'loading-game',
                    bytesLoaded: 0,
                    bytesTotal: gameBytesTotal,
                    assetsLoaded: 0,
                    assetsTotal: gameEntries.length,
                    progress: 0,
                    overallProgress: 0.3,
                    currentAsset: gamePaths[0] ?? null,
                    error: null,
                });

                await loader.loadMany(gamePaths, (loaded, _total, current) => {
                    if (cancelled) return;
                    const bytesLoaded = bytesFor(gameEntries, loaded);
                    const progress = phaseProgress(
                        bytesLoaded,
                        gameBytesTotal,
                        loaded,
                        _total
                    );
                    setState({
                        phase: 'loading-game',
                        bytesLoaded,
                        bytesTotal: gameBytesTotal,
                        assetsLoaded: loaded,
                        assetsTotal: _total,
                        progress,
                        overallProgress: 0.3 + progress * 0.7,
                        currentAsset: current,
                        error: null,
                    });
                });

                if (cancelled) return;

                setReadyPaths((prev) => {
                    const next = new Set(prev);
                    gamePaths.forEach((p) => next.add(p));
                    return next;
                });

                setAllDone(true);
                setState({
                    phase: 'complete',
                    bytesLoaded: manifest.totalSize,
                    bytesTotal: manifest.totalSize,
                    assetsLoaded: shellEntries.length + gameEntries.length,
                    assetsTotal: shellEntries.length + gameEntries.length,
                    progress: 1,
                    overallProgress: 1,
                    currentAsset: null,
                    error: null,
                });
            } catch (err) {
                if (cancelled) return;
                setState({
                    phase: 'error',
                    bytesLoaded: 0,
                    bytesTotal: 0,
                    assetsLoaded: 0,
                    assetsTotal: 0,
                    progress: 0,
                    overallProgress: 0,
                    currentAsset: null,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [manifest, loader, setState]);

    const getAssetUrl = useCallback(
        (path: string) => loader.getUrl(path),
        [loader]
    );

    const isReady = useCallback(
        (path: string) => readyPaths.has(path),
        [readyPaths]
    );

    const prefetch = useCallback(
        (paths: string[]) => loader.prefetch(paths),
        [loader]
    );

    const ctx: AssetContextValue = {
        state,
        getAssetUrl,
        isReady,
        prefetch,
        loader,
    };

    // Show loading screen until all required assets are done
    if (!allDone) {
        const loadingNode = renderLoading ? renderLoading(state) : null;
        return (
            <AssetContext.Provider value={ctx}>
                {loadingNode}
            </AssetContext.Provider>
        );
    }

    return (
        <AssetContext.Provider value={ctx}>{children}</AssetContext.Provider>
    );
}
