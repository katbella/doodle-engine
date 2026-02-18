/**
 * Asset manifest generation for doodle build.
 *
 * Scans the content directory and game config to produce an AssetManifest
 * describing all assets, their types, tiers, and byte sizes.
 */

import { stat } from "fs/promises";
import { join } from "path";
import type { AssetManifest, AssetEntry } from "@doodle-engine/core";
import { extractAssetPaths, getAssetType } from "@doodle-engine/core";
import type { ContentRegistry } from "@doodle-engine/core";
import type { GameConfig } from "@doodle-engine/core";

/**
 * Generate asset manifest from content registry and game config.
 * Called during `doodle build`.
 *
 * @param assetsDir - Absolute path to the public assets directory (e.g. /project/assets)
 * @param publicDir - Absolute path to the public root (assets are served relative to this)
 * @param registry  - Loaded content registry
 * @param config    - Parsed game config
 * @param version   - Manifest version string (used for cache busting)
 */
export async function generateAssetManifest(
  assetsDir: string,
  publicDir: string,
  registry: ContentRegistry,
  config: GameConfig,
  version: string = Date.now().toString(),
): Promise<AssetManifest> {
  const { shell: shellPaths, game: gamePaths } = extractAssetPaths(
    registry,
    config,
  );

  async function getSize(assetPath: string): Promise<number | undefined> {
    // Asset paths are like /assets/images/foo.png — strip the leading /
    const fsPath = join(
      publicDir,
      assetPath.startsWith("/") ? assetPath.slice(1) : assetPath,
    );
    try {
      const s = await stat(fsPath);
      return s.size;
    } catch {
      return undefined;
    }
  }

  const shellEntries: AssetEntry[] = await Promise.all(
    shellPaths.map(
      async (path): Promise<AssetEntry> => ({
        path,
        type: getAssetType(path),
        size: await getSize(path),
        tier: 1,
      }),
    ),
  );

  const gameEntries: AssetEntry[] = await Promise.all(
    gamePaths.map(
      async (path): Promise<AssetEntry> => ({
        path,
        type: getAssetType(path),
        size: await getSize(path),
        tier: 2,
      }),
    ),
  );

  const shellSize = shellEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);
  const gameSize = gameEntries.reduce((sum, e) => sum + (e.size ?? 0), 0);

  return {
    version,
    shell: shellEntries,
    game: gameEntries,
    shellSize,
    totalSize: shellSize + gameSize,
  };
}
