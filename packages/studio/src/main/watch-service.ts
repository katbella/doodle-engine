import { join, relative } from 'path';

/**
 * Watches a project's content folder and reports which file changed. It does no
 * loading or validation itself — the renderer decides what to do (reload just
 * that file's editor). Studio's own saves are filtered out by the caller so an
 * autosave doesn't echo back as an external change.
 */
export class WatchService {
    private watcher: { close: () => void } | null = null;

    async watch(
        projectDir: string,
        onFileChanged: (relPath: string) => void,
        isSelfWrite: (absPath: string) => boolean
    ): Promise<void> {
        this.stop();
        const { watch } = await import('chokidar');

        const handle = (absPath: string) => {
            if (isSelfWrite(absPath)) return;
            onFileChanged(relative(projectDir, absPath));
        };

        const w = watch(join(projectDir, 'content'), {
            ignored: /(^|[\/\\])\../,
            ignoreInitial: true,
            persistent: true,
            awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
        });
        w.on('change', handle).on('add', handle).on('unlink', handle);

        this.watcher = { close: () => void w.close() };
    }

    stop(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}
