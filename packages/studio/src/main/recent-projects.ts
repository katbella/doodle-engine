import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { RecentProject } from '../shared/project';

const MAX_RECENT = 10;

/**
 * Put an entry at the front of the recent list, drop any earlier entry for the
 * same path, and cap the length. Pure so it can be tested without disk.
 */
export function mergeRecent(
    existing: RecentProject[],
    entry: RecentProject,
    max: number = MAX_RECENT
): RecentProject[] {
    const withoutDuplicate = existing.filter((p) => p.path !== entry.path);
    return [entry, ...withoutDuplicate].slice(0, max);
}

export async function readRecentProjects(
    file: string
): Promise<RecentProject[]> {
    try {
        const parsed = JSON.parse(await readFile(file, 'utf-8'));
        return Array.isArray(parsed) ? (parsed as RecentProject[]) : [];
    } catch {
        return [];
    }
}

export async function addRecentProject(
    file: string,
    entry: RecentProject
): Promise<RecentProject[]> {
    const next = mergeRecent(await readRecentProjects(file), entry);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(next, null, 2));
    return next;
}
