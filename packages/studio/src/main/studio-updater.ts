// Keep release access and download URLs in the main process.

import type { StudioUpdateState } from '../shared/project';
import {
    selectStudioUpdate,
    studioUpdatePlatform,
    type GithubRelease,
    type StudioUpdateCandidate,
} from './studio-release';

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export interface StudioUpdaterOptions {
    currentVersion: string;
    platform: NodeJS.Platform;
    loadReleases: () => Promise<GithubRelease[]>;
    openExternal: (url: string) => Promise<unknown> | void;
    onState: (state: StudioUpdateState) => void;
    onError?: (context: string, error: unknown) => void;
    now?: () => number;
    cacheTtlMs?: number;
}

export class StudioUpdater {
    private readonly currentVersion: string;
    private readonly platform: ReturnType<typeof studioUpdatePlatform>;
    private readonly loadReleases: () => Promise<GithubRelease[]>;
    private readonly openExternal: (url: string) => Promise<unknown> | void;
    private readonly onState: (state: StudioUpdateState) => void;
    private readonly onError?: (context: string, error: unknown) => void;
    private readonly now: () => number;
    private readonly cacheTtlMs: number;

    private state: StudioUpdateState;
    private downloadUrl: string | null = null;
    private inFlight: Promise<void> | null = null;
    private activeManual = false;
    private recentResult: {
        checkedAt: number;
        candidate: StudioUpdateCandidate | null;
    } | null = null;

    constructor(options: StudioUpdaterOptions) {
        this.currentVersion = options.currentVersion;
        this.platform = studioUpdatePlatform(options.platform);
        this.loadReleases = options.loadReleases;
        this.openExternal = options.openExternal;
        this.onState = options.onState;
        this.onError = options.onError;
        this.now = options.now ?? Date.now;
        this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
        this.state = { status: 'idle', currentVersion: this.currentVersion };
    }

    getState(): StudioUpdateState {
        return this.state;
    }

    /** Coalesce checks; a manual request makes the shared result visible. */
    checkForUpdates(manual: boolean): Promise<void> {
        if (this.inFlight) {
            if (manual && !this.activeManual) {
                this.activeManual = true;
                this.setState({
                    status: 'checking',
                    currentVersion: this.currentVersion,
                    manual: true,
                });
            }
            return this.inFlight;
        }
        this.activeManual = manual;
        this.inFlight = this.run().finally(() => {
            this.inFlight = null;
        });
        return this.inFlight;
    }

    async openDownload(): Promise<void> {
        if (this.state.status !== 'available' || !this.downloadUrl) return;
        try {
            await this.openExternal(this.downloadUrl);
        } catch (error) {
            this.onError?.('update:openDownload', error);
        }
    }

    private async run(): Promise<void> {
        this.setState({
            status: 'checking',
            currentVersion: this.currentVersion,
            manual: this.activeManual,
        });
        try {
            const recent = this.recentResult;
            let candidate: StudioUpdateCandidate | null;
            if (recent && this.now() - recent.checkedAt < this.cacheTtlMs) {
                candidate = recent.candidate;
            } else {
                const releases = await this.loadReleases();
                candidate = selectStudioUpdate(
                    releases,
                    this.currentVersion,
                    this.platform
                );
                this.recentResult = {
                    checkedAt: this.now(),
                    candidate,
                };
            }
            if (candidate) {
                this.downloadUrl = candidate.downloadUrl;
                this.setState({
                    status: 'available',
                    currentVersion: this.currentVersion,
                    manual: this.activeManual,
                    version: candidate.version,
                    releaseNotes: candidate.releaseNotes,
                    platform: this.platform,
                });
            } else {
                this.downloadUrl = null;
                this.setState({
                    status: 'current',
                    currentVersion: this.currentVersion,
                    manual: this.activeManual,
                });
            }
        } catch (error) {
            this.downloadUrl = null;
            this.onError?.('update:check', error);
            this.setState({
                status: 'error',
                currentVersion: this.currentVersion,
                manual: this.activeManual,
                message: readableError(error),
            });
        }
    }

    private setState(state: StudioUpdateState): void {
        this.state = state;
        this.onState(state);
    }
}

function readableError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}
