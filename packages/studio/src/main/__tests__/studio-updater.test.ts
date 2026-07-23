import { describe, expect, it, vi } from 'vitest';
import { StudioUpdater } from '../studio-updater';
import type { GithubRelease } from '../studio-release';
import type { StudioUpdateState } from '../../shared/project';

function installer(name: string) {
    return { name, browser_download_url: `https://downloads.test/${name}` };
}

function studioRelease(version: string, assetName: string): GithubRelease {
    return {
        tag_name: `@doodle-engine/studio@${version}`,
        draft: false,
        prerelease: false,
        body: `Notes for ${version}`,
        assets: [installer(assetName)],
    };
}

interface Harness {
    updater: StudioUpdater;
    states: StudioUpdateState[];
    openExternal: ReturnType<typeof vi.fn>;
    onError: ReturnType<typeof vi.fn>;
    loadReleases: ReturnType<typeof vi.fn>;
}

function makeUpdater(
    loadReleases: () => Promise<GithubRelease[]>,
    platform: NodeJS.Platform = 'win32',
    timing: { now?: () => number; cacheTtlMs?: number } = {}
): Harness {
    const states: StudioUpdateState[] = [];
    const openExternal = vi.fn(async () => {});
    const onError = vi.fn();
    const load = vi.fn(loadReleases);
    const updater = new StudioUpdater({
        currentVersion: '0.2.0',
        platform,
        loadReleases: load,
        openExternal,
        onState: (state) => states.push(state),
        onError,
        ...timing,
    });
    return { updater, states, openExternal, onError, loadReleases: load };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('StudioUpdater', () => {
    it('starts idle', () => {
        const { updater } = makeUpdater(async () => []);
        expect(updater.getState()).toEqual({
            status: 'idle',
            currentVersion: '0.2.0',
        });
    });

    it('reports an available update from an automatic check and opens its installer', async () => {
        const { updater, states, openExternal } = makeUpdater(async () => [
            studioRelease('0.3.0', 'doodle-studio-0.3.0-setup.exe'),
        ]);

        await updater.checkForUpdates(false);

        expect(states).toEqual([
            { status: 'checking', currentVersion: '0.2.0', manual: false },
            {
                status: 'available',
                currentVersion: '0.2.0',
                manual: false,
                version: '0.3.0',
                releaseNotes: 'Notes for 0.3.0',
                platform: 'windows',
            },
        ]);

        await updater.openDownload();
        expect(openExternal).toHaveBeenCalledWith(
            'https://downloads.test/doodle-studio-0.3.0-setup.exe'
        );
    });

    it('reports "current" when nothing is newer', async () => {
        const { updater, states, openExternal } = makeUpdater(async () => [
            studioRelease('0.1.0', 'doodle-studio-0.1.0-setup.exe'),
        ]);

        await updater.checkForUpdates(true);

        expect(states.at(-1)).toEqual({
            status: 'current',
            currentVersion: '0.2.0',
            manual: true,
        });
        await updater.openDownload();
        expect(openExternal).not.toHaveBeenCalled();
    });

    it('carries the manual flag so the renderer knows whether to show a result', async () => {
        const automatic = makeUpdater(async () => []);
        await automatic.updater.checkForUpdates(false);
        expect(automatic.states.at(-1)).toMatchObject({
            status: 'current',
            manual: false,
        });

        const manual = makeUpdater(async () => []);
        await manual.updater.checkForUpdates(true);
        expect(manual.states.at(-1)).toMatchObject({
            status: 'current',
            manual: true,
        });
    });

    it('logs the error and reports it, keeping the manual flag', async () => {
        const failure = new Error('offline');
        const { updater, states, onError } = makeUpdater(async () => {
            throw failure;
        });

        await updater.checkForUpdates(false);

        expect(onError).toHaveBeenCalledWith('update:check', failure);
        expect(states.at(-1)).toEqual({
            status: 'error',
            currentVersion: '0.2.0',
            manual: false,
            message: 'offline',
        });
    });

    it('coalesces overlapping checks into one request', async () => {
        const gate = deferred<GithubRelease[]>();
        const { updater, loadReleases } = makeUpdater(() => gate.promise);

        const first = updater.checkForUpdates(false);
        const second = updater.checkForUpdates(false);
        expect(loadReleases).toHaveBeenCalledTimes(1);

        gate.resolve([]);
        await Promise.all([first, second]);
        expect(loadReleases).toHaveBeenCalledTimes(1);
    });

    it('reuses a recent result and refreshes it after the cache expires', async () => {
        let now = 1_000;
        const { updater, loadReleases, states } = makeUpdater(
            async () => [],
            'win32',
            { now: () => now, cacheTtlMs: 100 }
        );

        await updater.checkForUpdates(false);
        await updater.checkForUpdates(true);
        expect(loadReleases).toHaveBeenCalledTimes(1);
        expect(states.at(-1)).toMatchObject({
            status: 'current',
            manual: true,
        });

        now += 101;
        await updater.checkForUpdates(true);
        expect(loadReleases).toHaveBeenCalledTimes(2);
    });

    it('promotes an in-flight automatic check when the user asks manually', async () => {
        const gate = deferred<GithubRelease[]>();
        const { updater, states } = makeUpdater(() => gate.promise);

        const automatic = updater.checkForUpdates(false);
        const manual = updater.checkForUpdates(true);

        expect(states).toEqual([
            { status: 'checking', currentVersion: '0.2.0', manual: false },
            { status: 'checking', currentVersion: '0.2.0', manual: true },
        ]);

        gate.resolve([studioRelease('0.4.0', 'doodle-studio-0.4.0-setup.exe')]);
        await Promise.all([automatic, manual]);

        expect(states.at(-1)).toMatchObject({
            status: 'available',
            version: '0.4.0',
            manual: true,
        });
    });

    it('offers the DMG on macOS', async () => {
        const { updater, states } = makeUpdater(
            async () => [
                studioRelease('0.3.0', 'doodle-studio-0.3.0-universal.dmg'),
            ],
            'darwin'
        );

        await updater.checkForUpdates(false);

        expect(states.at(-1)).toMatchObject({
            status: 'available',
            platform: 'mac',
            version: '0.3.0',
        });
    });

    it('does not open a previous download while a new check is running', async () => {
        const gate = deferred<GithubRelease[]>();
        let request = 0;
        const { updater, openExternal } = makeUpdater(
            () => {
                request += 1;
                return request === 1
                    ? Promise.resolve([
                          studioRelease(
                              '0.3.0',
                              'doodle-studio-0.3.0-setup.exe'
                          ),
                      ])
                    : gate.promise;
            },
            'win32',
            { cacheTtlMs: 0 }
        );

        await updater.checkForUpdates(false);
        const checking = updater.checkForUpdates(true);
        await updater.openDownload();
        expect(openExternal).not.toHaveBeenCalled();

        gate.resolve([]);
        await checking;
    });
});
