/**
 * Asset path resolution utilities.
 *
 * Game authors write bare filenames in YAML content files.
 * The engine resolves them to web paths based on the asset category.
 *
 * Resolved paths are relative (`assets/...`, no leading slash) so a built
 * game works wherever it is hosted: at a domain root, under a folder like
 * `example.com/games/my-game/`, or behind a wrapper. The browser resolves
 * them against the page's own address.
 *
 * Escape hatch: a value that already starts with `/`, `http(s)://`, `data:`,
 * or `blob:` is returned as-is so authors can point anywhere they need.
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
 * Resolve a bare filename or path to an asset URL path.
 *
 * - Bare filenames are resolved using the category convention:
 *   `resolveAssetPath('tavern.png', 'banner')` → `assets/images/banners/tavern.png`
 * - Paths starting with `assets/` are kept as written.
 * - Paths starting with `/`, `http(s)://`, `data:`, or `blob:` are returned unchanged.
 * - Empty or undefined values return an empty string.
 *
 * @param filename - Bare filename or full path from a YAML field
 * @param category - Asset category that determines the subdirectory
 * @returns Path suitable for use in `<img src>`, `<audio src>`, etc.
 */
export function resolveAssetPath(
    filename: string | undefined,
    category: AssetCategory
): string {
    if (!filename) return '';
    if (filename.startsWith('assets/')) {
        return filename;
    }
    // Escape hatch: already an absolute path or URL-like value
    if (
        filename.startsWith('/') ||
        filename.startsWith('http://') ||
        filename.startsWith('https://') ||
        filename.startsWith('data:') ||
        filename.startsWith('blob:')
    ) {
        return filename;
    }
    return `assets/${CATEGORY_PREFIX[category]}/${filename}`;
}
