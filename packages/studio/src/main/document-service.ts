import { readFile, writeFile, rename, stat } from 'fs/promises';
import { join, resolve, dirname, basename, sep } from 'path';
import { applyYamlEdits, type YamlEdit } from '@doodle-engine/toolkit';
import type { DocumentContent, WriteResult } from '../shared/project';

/**
 * Reads and writes individual project files for the editor.
 *
 * Writes are atomic (write a temp file, then rename over the target) so a crash
 * mid-save can't leave a half-written file. Saves carry the file's last-known
 * modified time; if the file changed on disk since it was read, the write is
 * refused as a conflict so an external edit is never silently clobbered.
 *
 * All paths are confined to the project root.
 */
export class DocumentService {
    /** Called with the absolute path of each file this service writes. */
    constructor(private readonly onWrite?: (absPath: string) => void) {}

    private resolveInProject(projectDir: string, relPath: string): string {
        const root = resolve(projectDir);
        const abs = resolve(root, relPath);
        if (abs !== root && !abs.startsWith(root + sep)) {
            throw new Error(`Path escapes the project: ${relPath}`);
        }
        return abs;
    }

    async read(projectDir: string, relPath: string): Promise<DocumentContent> {
        const abs = this.resolveInProject(projectDir, relPath);
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
        const abs = this.resolveInProject(projectDir, relPath);

        // Refuse to overwrite an external edit made since the file was read.
        if (expectedMtimeMs !== undefined) {
            const current = await stat(abs).catch(() => null);
            if (current && current.mtimeMs !== expectedMtimeMs) {
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
        await writeFile(temp, content, 'utf-8');
        this.onWrite?.(abs);
        await rename(temp, abs);

        const info = await stat(abs);
        return { ok: true, conflict: false, mtimeMs: info.mtimeMs };
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
        const abs = this.resolveInProject(projectDir, relPath);
        const source = await readFile(abs, 'utf-8');
        const next = applyYamlEdits(source, edits);
        return this.write(projectDir, relPath, next, expectedMtimeMs);
    }
}
