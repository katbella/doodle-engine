/**
 * Asset path resolution utilities.
 *
 * Game authors write bare filenames in YAML content files.
 * The engine resolves them to full web paths based on the asset category.
 *
 * Escape hatch: if a value already starts with `/` or `assets/`, it is
 * returned as-is so authors can override the convention when needed.
 */

export type AssetCategory =
    | 'portrait'
    | 'banner'
    | 'item'
    | 'map'
    | 'music'
    | 'ambient'
    | 'sfx'
    | 'voice'
    | 'video';

const CATEGORY_PREFIX: Record<AssetCategory, string> = {
    portrait: 'images/portraits',
    banner: 'images/banners',
    item: 'images/items',
    map: 'images/maps',
    music: 'audio/music',
    ambient: 'audio/sfx',
    sfx: 'audio/sfx',
    voice: 'audio/voice',
    video: 'video',
};

/**
 * Resolve a bare filename or path to a full asset URL path.
 *
 * - Bare filenames are resolved using the category convention:
 *   `resolveAssetPath('tavern.png', 'banner')` → `/assets/images/banners/tavern.png`
 * - Paths already starting with `/` or `assets/` are returned unchanged.
 * - Empty or undefined values return an empty string.
 *
 * @param filename - Bare filename or full path from a YAML field
 * @param category - Asset category that determines the subdirectory
 * @returns Full path suitable for use in `<img src>`, `<audio src>`, etc.
 */
export function resolveAssetPath(
    filename: string | undefined,
    category: AssetCategory
): string {
    if (!filename) return '';
    // Escape hatch: already an absolute path or explicitly prefixed
    if (filename.startsWith('/') || filename.startsWith('assets/')) {
        return filename;
    }
    return `/assets/${CATEGORY_PREFIX[category]}/${filename}`;
}
