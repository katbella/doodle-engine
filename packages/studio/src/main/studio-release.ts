// Packages release independently, so Studio must select from all repository
// releases instead of relying on GitHub's repository-wide "latest" release.

import type { StudioUpdatePlatform } from '../shared/project';

export interface GithubReleaseAsset {
    name: string;
    browser_download_url: string;
}

export interface GithubRelease {
    tag_name: string;
    draft: boolean;
    prerelease: boolean;
    body: string | null;
    assets: GithubReleaseAsset[];
}

export interface StudioUpdateCandidate {
    version: string;
    releaseNotes: string | null;
    downloadUrl: string;
}

const STUDIO_TAG_PREFIX = '@doodle-engine/studio@';
const RELEASES_PER_PAGE = 100;
const RELEASE_REQUEST_TIMEOUT_MS = 15_000;

interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease: string | null;
}

export function parseVersion(value: string): ParsedVersion | null {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(value);
    if (!match) return null;
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ?? null,
    };
}

/** Compare numeric components; prereleases are filtered before this point. */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
    if (a.major !== b.major) return a.major < b.major ? -1 : 1;
    if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
    if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
    return 0;
}

export function parseStudioTag(tag: string): string | null {
    if (!tag.startsWith(STUDIO_TAG_PREFIX)) return null;
    return tag.slice(STUDIO_TAG_PREFIX.length);
}

export function studioUpdatePlatform(
    platform: NodeJS.Platform
): StudioUpdatePlatform {
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'mac';
    return 'other';
}

function assetSuffix(platform: StudioUpdatePlatform): string | null {
    if (platform === 'windows') return '.exe';
    if (platform === 'mac') return '.dmg';
    return null;
}

function findAsset(
    assets: GithubReleaseAsset[],
    suffix: string
): GithubReleaseAsset | null {
    return (
        assets.find((asset) => asset.name.toLowerCase().endsWith(suffix)) ??
        null
    );
}

/** Select the newest stable update with an installer for this platform. */
export function selectStudioUpdate(
    releases: readonly GithubRelease[],
    currentVersion: string,
    platform: StudioUpdatePlatform
): StudioUpdateCandidate | null {
    const current = parseVersion(currentVersion);
    const suffix = assetSuffix(platform);
    if (!current || !suffix) return null;

    let best: {
        parsed: ParsedVersion;
        candidate: StudioUpdateCandidate;
    } | null = null;
    for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const version = parseStudioTag(release.tag_name);
        if (!version) continue;
        const parsed = parseVersion(version);
        if (!parsed || parsed.prerelease) continue;
        if (compareVersions(parsed, current) <= 0) continue;
        const asset = findAsset(release.assets, suffix);
        if (!asset) continue;
        if (best && compareVersions(parsed, best.parsed) <= 0) continue;
        best = {
            parsed,
            candidate: {
                version,
                releaseNotes: release.body ?? null,
                downloadUrl: asset.browser_download_url,
            },
        };
    }
    return best?.candidate ?? null;
}

/** Load public releases without embedding a GitHub token. */
export function createGithubReleasesLoader(
    repo: string
): () => Promise<GithubRelease[]> {
    return async () => {
        const releases: GithubRelease[] = [];
        for (let page = 1; ; page += 1) {
            const pageQuery = page === 1 ? '' : `&page=${page}`;
            const response = await fetch(
                `https://api.github.com/repos/${repo}/releases?per_page=${RELEASES_PER_PAGE}${pageQuery}`,
                {
                    signal: AbortSignal.timeout(RELEASE_REQUEST_TIMEOUT_MS),
                    headers: {
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        'User-Agent': 'doodle-studio-updater',
                    },
                }
            );
            if (!response.ok) {
                throw new Error(
                    `GitHub returned ${response.status} while checking for updates.`
                );
            }
            const pageReleases: unknown = await response.json();
            if (!Array.isArray(pageReleases)) {
                throw new Error(
                    'GitHub returned an unreadable release list while checking for updates.'
                );
            }
            releases.push(...(pageReleases as GithubRelease[]));
            if (pageReleases.length < RELEASES_PER_PAGE) return releases;
        }
    };
}
