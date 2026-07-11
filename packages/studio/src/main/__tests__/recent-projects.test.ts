import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    mergeRecent,
    readRecentProjects,
    addRecentProject,
} from '../recent-projects';

describe('mergeRecent', () => {
    it('puts the new entry first and drops an earlier one for the same path', () => {
        const a = { path: '/a', name: 'A', openedAt: '1' };
        const b = { path: '/b', name: 'B', openedAt: '2' };
        const aAgain = { path: '/a', name: 'A renamed', openedAt: '3' };

        const merged = mergeRecent([a, b], aAgain);
        expect(merged.map((p) => p.path)).toEqual(['/a', '/b']);
        expect(merged[0].name).toBe('A renamed');
    });

    it('caps the list length', () => {
        const list = Array.from({ length: 12 }, (_, i) => ({
            path: `/p${i}`,
            name: `${i}`,
            openedAt: `${i}`,
        }));
        const merged = mergeRecent(
            list,
            { path: '/new', name: 'n', openedAt: 'x' },
            10
        );
        expect(merged).toHaveLength(10);
        expect(merged[0].path).toBe('/new');
    });
});

describe('readRecentProjects / addRecentProject', () => {
    it('returns [] for a missing file', async () => {
        expect(
            await readRecentProjects(join(tmpdir(), 'no-such-doodle-recent.json'))
        ).toEqual([]);
    });

    it('writes then reads back, most recent first', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'doodle-recent-'));
        const file = join(dir, 'recent.json');
        try {
            await addRecentProject(file, {
                path: '/one',
                name: 'One',
                openedAt: '1',
            });
            await addRecentProject(file, {
                path: '/two',
                name: 'Two',
                openedAt: '2',
            });
            const list = await readRecentProjects(file);
            expect(list.map((p) => p.path)).toEqual(['/two', '/one']);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
