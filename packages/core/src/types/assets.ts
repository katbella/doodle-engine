/**
 * Asset system types for the offline-first asset loading system.
 */

/** A single asset entry in the manifest */
export interface AssetEntry {
  /** Asset path relative to public root */
  path: string;
  /** Asset type for loading strategy */
  type: "image" | "audio" | "video";
  /** File size in bytes (for progress calculation) */
  size?: number;
  /** Which tier this asset belongs to */
  tier: 0 | 1 | 2;
}

/** Complete asset manifest generated at build time */
export interface AssetManifest {
  /** Version for cache invalidation */
  version: string;
  /** Shell assets (tier 1) — load first */
  shell: AssetEntry[];
  /** Game assets (tier 2) — load with progress */
  game: AssetEntry[];
  /** Total size in bytes */
  totalSize: number;
  /** Shell size in bytes */
  shellSize: number;
}

/** Current loading state */
export interface AssetLoadingState {
  /** Current phase */
  phase: "idle" | "loading-shell" | "loading-game" | "complete" | "error";
  /** Bytes loaded so far */
  bytesLoaded: number;
  /** Total bytes to load in current phase */
  bytesTotal: number;
  /** Progress 0-1 for current phase */
  progress: number;
  /** Overall progress 0-1 across all phases */
  overallProgress: number;
  /** Currently loading asset path (for display) */
  currentAsset: string | null;
  /** Error message if phase is 'error' */
  error: string | null;
}
