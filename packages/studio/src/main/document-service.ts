import {
    mkdir,
    readFile,
    realpath,
    rename,
    stat,
    unlink,
    writeFile,
} from 'fs/promises';
import { join, resolve, dirname, basename, sep } from 'path';
import { applyYamlEdits, type YamlEdit } from '@doodle-engine/toolkit';
import type { DocumentContent, WriteResult } from '../shared/project';

type RenameOperation = (from: string, to: string) => Promise<void>;
type WaitOperation = (delayMs: number) => Promise<void>;

const RENAME_RETRY_DELAYS_MS = [10, 25, 50, 100, 200];
const RETRYABLE_RENAME_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);

const wait: WaitOperation = (delayMs) =>
    new Promise((resolveWait) => setTimeout(resolveWait, delayMs));

/**
 * Windows can briefly hold a destination file while an editor, indexer, or
 * antivirus scanner inspects it. Retry only those transient rename errors;
 * all other filesystem failures still surface immediately.
 */
export async function renameWithRetry(
    from: string,
    to: string,
    renameFile: RenameOperation = rename,
    waitForRetry: WaitOperation = wait
): Promise<void> {
    for (let attempt = 0; ; attempt++) {
        try {
            await renameFile(from, to);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            const delayMs = RENAME_RETRY_DELAYS_MS[attempt];
            if (
                !RETRYABLE_RENAME_CODES.has(code ?? '') ||
                delayMs === undefined
            )
                throw error;
            await waitForRetry(delayMs);
        }
    }
}

/**
 * Reads and writes individual project files for the editor.
 *
 * Writes are atomic (write a temp file, then rename over the target) so a crash
 * mid-save can't leave a half-written file. Saves carry the file's last-known
 * modified time; if the file changed on disk since it was read, or was deleted
 * outside Studio, the write is refused as a conflict so an external edit is
 * never silently clobbered.
 *
 * All paths are confined to the project root. The check resolves links and
 * junctions to their real place on disk, so a link inside the project cannot
 * point an operation at a file outside it.
 */
export class DocumentService {
    /** Called with the absolute path of each file this service writes. */
    constructor(private readonly onWrite?: (absPath: string) => void) {}

    private async resolveInProject(
        projectDir: string,
        relPath: string
    ): Promise<string> {
        // The project root's real location, with any links resolved.
        const root = await realpath(resolve(projectDir));
        const abs = resolve(root, relPath);

        // Resolve the deepest part of the target that exists (for a new file
        // in a new folder, that may be an ancestor several levels up), so a
        // linked folder inside the project cannot reach outside it.
        let existing = abs;
        const pending: string[] = [];
        let real: string | null = null;
        while (real === null) {
            real = await realpath(existing).catch(() => null);
            if (real === null) {
                const parent = dirname(existing);
                if (parent === existing) {
                    throw new Error(`Path cannot be resolved: ${relPath}`);
                }
                pending.unshift(basename(existing));
                existing = parent;
            }
        }
        real = pending.length > 0 ? join(real, ...pending) : real;

        if (real !== root && !real.startsWith(root + sep)) {
            throw new Error(`Path escapes the project: ${relPath}`);
        }
        return real;
    }

    async read(projectDir: string, relPath: string): Promise<DocumentContent> {
        const abs = await this.resolveInProject(projectDir, relPath);
        const [content, info] = await Promise.all([
            readFile(abs, 'utf-8'),
            stat(abs),
        ]);
        return { content, mtimeMs: info.mtimeMs };
    }

    async write(
        projectDir: string,
        relPath: string,
        content: string,
        expectedMtimeMs?: number
    ): Promise<WriteResult> {
        const abs = await this.resolveInProject(projectDir, relPath);

        // Refuse to overwrite an external edit made since the file was read.
        // A file that has disappeared is an external change too: recreating
        // it silently would undo someone's delete, so that is refused as
        // well and the caller decides what to do.
        if (expectedMtimeMs !== undefined) {
            const current = await stat(abs).catch(() => null);
            if (current === null) {
                return { ok: false, conflict: true, missing: true, mtimeMs: 0 };
            }
            if (current.mtimeMs !== expectedMtimeMs) {
                return {
                    ok: false,
                    conflict: true,
                    mtimeMs: current.mtimeMs,
                    content: await readFile(abs, 'utf-8'),
                };
            }
        }

        const temp = join(
            dirname(abs),
            `.${basename(abs)}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
        );
        await mkdir(dirname(abs), { recursive: true });
        try {
            await writeFile(temp, content, 'utf-8');
            this.onWrite?.(abs);
            await renameWithRetry(temp, abs);
        } catch (error) {
            await unlink(temp).catch(() => undefined);
            throw error;
        }

        const info = await stat(abs);
        return { ok: true, conflict: false, mtimeMs: info.mtimeMs };
    }

    /** Delete a project file. Notifies the write hook so the watcher ignores it. */
    async delete(projectDir: string, relPath: string): Promise<void> {
        const abs = await this.resolveInProject(projectDir, relPath);
        this.onWrite?.(abs);
        await unlink(abs);
    }

    /** Rename (move) a project file within the project. */
    async renameFile(
        projectDir: string,
        fromRel: string,
        toRel: string
    ): Promise<void> {
        const from = await this.resolveInProject(projectDir, fromRel);
        const to = await this.resolveInProject(projectDir, toRel);
        this.onWrite?.(from);
        this.onWrite?.(to);
        await renameWithRetry(from, to);
    }

    /**
     * Apply form field edits to a YAML file, preserving its comments, key order,
     * and any keys the form doesn't touch. Reads the current file, splices in
     * the changed values, and writes it back through the same atomic,
     * conflict-checked path as `write`.
     */
    async writeEntityFields(
        projectDir: string,
        relPath: string,
        edits: YamlEdit[],
        expectedMtimeMs?: number
    ): Promise<WriteResult> {
        const abs = await this.resolveInProject(projectDir, relPath);
        const source = await readFile(abs, 'utf-8');
        const next = applyYamlEdits(source, edits);
        return this.write(projectDir, relPath, next, expectedMtimeMs);
    }
}
