import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DocumentService, renameWithRetry } from '../document-service';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('DocumentService', () => {
    it('retries transient Windows rename failures with bounded backoff', async () => {
        const transient = Object.assign(new Error('file is briefly locked'), {
            code: 'EPERM',
        });
        const rename = vi
            .fn()
            .mockRejectedValueOnce(transient)
            .mockRejectedValueOnce(transient)
            .mockResolvedValue(undefined);
        const delays: number[] = [];

        await renameWithRetry(
            'temp.yaml',
            'target.yaml',
            rename,
            async (ms) => {
                delays.push(ms);
            }
        );

        expect(rename).toHaveBeenCalledTimes(3);
        expect(delays).toEqual([10, 25]);
    });

    it('does not retry non-transient rename failures', async () => {
        const failure = Object.assign(new Error('invalid path'), {
            code: 'EINVAL',
        });
        const rename = vi.fn().mockRejectedValue(failure);

        await expect(
            renameWithRetry('temp.yaml', 'target.yaml', rename)
        ).rejects.toBe(failure);
        expect(rename).toHaveBeenCalledOnce();
    });

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

    it('renames a file and notifies the write hook for both paths', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const writes: string[] = [];
            const svc = new DocumentService((path) => writes.push(path));
            await writeFile(join(dir, 'old.txt'), 'keep me');

            await svc.renameFile(dir, 'old.txt', 'new.txt');

            expect(await readFile(join(dir, 'new.txt'), 'utf-8')).toBe(
                'keep me'
            );
            await expect(
                readFile(join(dir, 'old.txt'), 'utf-8')
            ).rejects.toThrow();
            expect(writes).toEqual([
                join(dir, 'old.txt'),
                join(dir, 'new.txt'),
            ]);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('writes YAML field edits without losing comments or unrelated keys', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const file = join(dir, 'character.yaml');
            await writeFile(
                file,
                '# shopkeeper\nid: merchant\nname: Old Name\ncustom: keep\n'
            );
            const writes: string[] = [];
            const svc = new DocumentService((path) => writes.push(path));
            const original = await svc.read(dir, 'character.yaml');

            const result = await svc.writeEntityFields(
                dir,
                'character.yaml',
                [{ path: ['name'], value: 'New Name' }],
                original.mtimeMs
            );

            expect(result.ok).toBe(true);
            const saved = await readFile(file, 'utf-8');
            expect(saved).toContain('# shopkeeper');
            expect(saved).toContain('name: New Name');
            expect(saved).toContain('custom: keep');
            expect(writes).toEqual([file]);
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

describe('DocumentService external deletes and links', () => {
    it('reports a conflict instead of recreating a deleted file', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            await writeFile(join(dir, 'f.txt'), 'original');
            const read = await svc.read(dir, 'f.txt');

            const { unlink, stat } = await import('node:fs/promises');
            await unlink(join(dir, 'f.txt'));

            const result = await svc.write(dir, 'f.txt', 'mine', read.mtimeMs);
            expect(result.ok).toBe(false);
            expect(result.conflict).toBe(true);
            expect(result.missing).toBe(true);
            await expect(stat(join(dir, 'f.txt'))).rejects.toThrow();
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('refuses to write through a link that points outside the project', async () => {
        const outside = await mkdtemp(join(tmpdir(), 'doodle-outside-'));
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const { mkdir, symlink } = await import('node:fs/promises');
            await writeFile(join(outside, 'linked.yaml'), 'id: linked\n');
            await mkdir(join(dir, 'content'), { recursive: true });
            await symlink(
                outside,
                join(dir, 'content', 'locations'),
                'junction'
            );

            const svc = new DocumentService();
            await expect(
                svc.write(dir, 'content/locations/linked.yaml', 'changed')
            ).rejects.toThrow('escapes the project');

            const untouched = await import('node:fs/promises').then((fs) =>
                fs.readFile(join(outside, 'linked.yaml'), 'utf-8')
            );
            expect(untouched).toBe('id: linked\n');
        } finally {
            await rm(dir, { recursive: true, force: true });
            await rm(outside, { recursive: true, force: true });
        }
    });

    it('creates a missing content folder when saving a brand-new file', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-doc-'));
        try {
            const svc = new DocumentService();
            const result = await svc.write(
                dir,
                'content/interludes/new.yaml',
                'id: new\n'
            );
            expect(result.ok).toBe(true);
            expect(
                (await svc.read(dir, 'content/interludes/new.yaml')).content
            ).toBe('id: new\n');
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
