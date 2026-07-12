import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DocumentService } from '../document-service';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('DocumentService', () => {
    it('reads a file, writes it atomically, and reads the new content back', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            await writeFile(join(dir, 'content.txt'), 'hello');
            const svc = new DocumentService();

            const read = await svc.read(dir, 'content.txt');
            expect(read.content).toBe('hello');

            const result = await svc.write(
                dir,
                'content.txt',
                'world',
                read.mtimeMs
            );
            expect(result.ok).toBe(true);
            expect(result.conflict).toBe(false);
            expect((await svc.read(dir, 'content.txt')).content).toBe('world');
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('refuses to overwrite a file that changed on disk since it was read', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            await writeFile(join(dir, 'f.txt'), 'a');
            const read = await svc.read(dir, 'f.txt');

            await wait(20);
            await writeFile(join(dir, 'f.txt'), 'external edit');

            const result = await svc.write(dir, 'f.txt', 'mine', read.mtimeMs);
            expect(result.conflict).toBe(true);
            expect(result.content).toBe('external edit');
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('rejects a path that escapes the project', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            await expect(svc.read(dir, '../secret.txt')).rejects.toThrow(
                /escape/i
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('deletes a file so it can no longer be read', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            await writeFile(join(dir, 'gone.txt'), 'bye');

            await svc.delete(dir, 'gone.txt');

            await expect(svc.read(dir, 'gone.txt')).rejects.toThrow();
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('refuses to delete a path that escapes the project', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            await expect(svc.delete(dir, '../secret.txt')).rejects.toThrow(
                /escape/i
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
