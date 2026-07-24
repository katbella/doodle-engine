import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    compareVersions,
    createGithubReleasesLoader,
    parseStudioTag,
    parseVersion,
    selectStudioUpdate,
    studioUpdatePlatform,
    type GithubRelease,
} from '../studio-release';

function installer(name: string) {
    return { name, browser_download_url: `https://downloads.test/${name}` };
}

function release(
    tag: string,
    overrides: Partial<GithubRelease> = {}
): GithubRelease {
    return {
        tag_name: tag,
        draft: false,
        prerelease: false,
        body: null,
        assets: [],
        ...overrides,
    };
}

const studioTag = (version: string) => `@doodle-engine/studio@${version}`;

describe('parseVersion', () => {
    it('reads major, minor, patch, and an optional prerelease', () => {
        expect(parseVersion('0.10.3')).toEqual({
            major: 0,
            minor: 10,
            patch: 3,
            prerelease: null,
        });
        expect(parseVersion('1.2.0-beta.1')).toEqual({
            major: 1,
            minor: 2,
            patch: 0,
            prerelease: 'beta.1',
        });
    });

    it('rejects anything that is not a version', () => {
        expect(parseVersion('1.2')).toBeNull();
        expect(parseVersion('v1.2.3')).toBeNull();
        expect(parseVersion('latest')).toBeNull();
        expect(parseVersion('')).toBeNull();
    });
});

describe('compareVersions', () => {
    it('orders by number, so 0.10.0 is newer than 0.9.0', () => {
        const a = parseVersion('0.10.0')!;
        const b = parseVersion('0.9.0')!;
        expect(compareVersions(a, b)).toBe(1);
        expect(compareVersions(b, a)).toBe(-1);
        expect(compareVersions(a, a)).toBe(0);
    });
});

describe('parseStudioTag', () => {
    it('returns the version for a Studio tag and null otherwise', () => {
        expect(parseStudioTag('@doodle-engine/studio@0.3.0')).toBe('0.3.0');
        expect(parseStudioTag('@doodle-engine/core@0.3.0')).toBeNull();
        expect(parseStudioTag('studio@0.3.0')).toBeNull();
    });
});

describe('studioUpdatePlatform', () => {
    it('maps the process platform to an install path', () => {
        expect(studioUpdatePlatform('win32')).toBe('windows');
        expect(studioUpdatePlatform('darwin')).toBe('mac');
        expect(studioUpdatePlatform('linux')).toBe('other');
    });
});

describe('selectStudioUpdate', () => {
    it('picks the highest version above the installed one with a matching installer', () => {
        const releases = [
            release(studioTag('0.3.0'), {
                assets: [installer('doodle-studio-0.3.0-setup.exe')],
            }),
            release(studioTag('0.10.0'), {
                body: 'Notes',
                assets: [installer('doodle-studio-0.10.0-setup.exe')],
            }),
            release(studioTag('0.9.0'), {
                assets: [installer('doodle-studio-0.9.0-setup.exe')],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'windows')).toEqual({
            version: '0.10.0',
            releaseNotes: 'Notes',
            downloadUrl:
                'https://downloads.test/doodle-studio-0.10.0-setup.exe',
        });
    });

    it('matches the DMG installer on macOS', () => {
        const releases = [
            release(studioTag('0.3.0'), {
                assets: [
                    installer('doodle-studio-0.3.0-setup.exe'),
                    installer('doodle-studio-0.3.0-universal.dmg'),
                ],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'mac')).toEqual({
            version: '0.3.0',
            releaseNotes: null,
            downloadUrl:
                'https://downloads.test/doodle-studio-0.3.0-universal.dmg',
        });
    });

    it('returns null when nothing is newer than the installed version', () => {
        const releases = [
            release(studioTag('0.2.0'), {
                assets: [installer('doodle-studio-0.2.0-setup.exe')],
            }),
            release(studioTag('0.1.0'), {
                assets: [installer('doodle-studio-0.1.0-setup.exe')],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'windows')).toBeNull();
    });

    it('ignores drafts, prereleases, other packages, malformed tags, and incomplete releases', () => {
        const releases = [
            release(studioTag('0.9.0'), {
                draft: true,
                assets: [installer('doodle-studio-0.9.0-setup.exe')],
            }),
            release(studioTag('0.9.1'), {
                prerelease: true,
                assets: [installer('doodle-studio-0.9.1-setup.exe')],
            }),
            release(studioTag('0.11.0-beta.1'), {
                assets: [installer('doodle-studio-0.11.0-beta.1-setup.exe')],
            }),
            release('@doodle-engine/core@0.20.0', {
                assets: [installer('core-0.20.0.exe')],
            }),
            release(studioTag('not-a-version'), {
                assets: [installer('doodle-studio-setup.exe')],
            }),
            release(studioTag('0.8.0'), {
                assets: [installer('doodle-studio-0.8.0-universal.dmg')],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'windows')).toBeNull();
    });

    it('ignores a release that is missing this platform installer', () => {
        const releases = [
            release(studioTag('0.5.0'), {
                assets: [installer('doodle-studio-0.5.0-universal.dmg')],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'windows')).toBeNull();
        expect(selectStudioUpdate(releases, '0.2.0', 'mac')).not.toBeNull();
    });

    it('returns null for an unsupported platform or an unreadable current version', () => {
        const releases = [
            release(studioTag('0.5.0'), {
                assets: [installer('doodle-studio-0.5.0-setup.exe')],
            }),
        ];
        expect(selectStudioUpdate(releases, '0.2.0', 'other')).toBeNull();
        expect(selectStudioUpdate(releases, 'unknown', 'windows')).toBeNull();
    });
});

describe('createGithubReleasesLoader', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('requests public releases without a token and returns the JSON', async () => {
        const body = [release(studioTag('0.3.0'))];
        const fetchMock = vi.fn(async (_url: string, _options: any) => ({
            ok: true,
            status: 200,
            json: async () => body,
        }));
        vi.stubGlobal('fetch', fetchMock);

        const load = createGithubReleasesLoader('katbella/doodle-engine');
        await expect(load()).resolves.toEqual(body);

        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe(
            'https://api.github.com/repos/katbella/doodle-engine/releases?per_page=100'
        );
        expect(options.headers).not.toHaveProperty('Authorization');
        expect(options.headers.Accept).toBe('application/vnd.github+json');
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('continues through full pages of unrelated repository releases', async () => {
        const firstPage = Array.from({ length: 100 }, (_, index) =>
            release(`@doodle-engine/core@1.0.${index}`)
        );
        const secondPage = [release(studioTag('0.3.0'))];
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => firstPage,
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => secondPage,
            });
        vi.stubGlobal('fetch', fetchMock);

        const load = createGithubReleasesLoader('katbella/doodle-engine');
        await expect(load()).resolves.toEqual([...firstPage, ...secondPage]);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1][0]).toBe(
            'https://api.github.com/repos/katbella/doodle-engine/releases?per_page=100&page=2'
        );
    });

    it('throws a readable error when GitHub responds with a failure', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                status: 403,
                json: async () => [],
            }))
        );
        const load = createGithubReleasesLoader('katbella/doodle-engine');
        await expect(load()).rejects.toThrow('403');
    });

    it('rejects an unreadable release payload', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                status: 200,
                json: async () => ({ releases: [] }),
            }))
        );
        const load = createGithubReleasesLoader('katbella/doodle-engine');
        await expect(load()).rejects.toThrow('unreadable release list');
    });
});
