import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { dirname, normalize } from 'path';
import type { RecentProject } from '../shared/project';

const MAX_RECENT = 10;

function pathKey(path: string): string {
    const normalized = normalize(path);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function validEntries(value: unknown): RecentProject[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (entry): entry is RecentProject =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof entry.path === 'string' &&
            typeof entry.name === 'string' &&
            typeof entry.openedAt === 'string'
    );
}

/**
 * Put an entry at the front of the recent list, drop any earlier entry for the
 * same path, and cap the length. Pure so it can be tested without disk.
 */
export function mergeRecent(
    existing: RecentProject[],
    entry: RecentProject,
    max: number = MAX_RECENT
): RecentProject[] {
    const key = pathKey(entry.path);
    const withoutDuplicate = existing.filter((p) => pathKey(p.path) !== key);
    return [entry, ...withoutDuplicate].slice(0, max);
}

export async function readRecentProjects(
    file: string
): Promise<RecentProject[]> {
    try {
        return validEntries(JSON.parse(await readFile(file, 'utf-8')));
    } catch {
        return [];
    }
}

async function writeRecentProjects(
    file: string,
    entries: RecentProject[]
): Promise<void> {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(entries, null, 2));
}

/** Drop missing/non-directory projects and de-duplicate paths on Welcome load. */
export async function pruneRecentProjects(
    file: string
): Promise<RecentProject[]> {
    const existing = await readRecentProjects(file);
    const seen = new Set<string>();
    const checks = await Promise.all(
        existing.map(async (entry) => {
            const key = pathKey(entry.path);
            if (seen.has(key)) return null;
            seen.add(key);
            try {
                return (await stat(entry.path)).isDirectory() ? entry : null;
            } catch {
                return null;
            }
        })
    );
    const next = checks.filter((entry): entry is RecentProject => !!entry);
    if (next.length !== existing.length) await writeRecentProjects(file, next);
    return next;
}

export async function removeRecentProject(
    file: string,
    projectPath: string
): Promise<RecentProject[]> {
    const key = pathKey(projectPath);
    const next = (await readRecentProjects(file)).filter(
        (entry) => pathKey(entry.path) !== key
    );
    await writeRecentProjects(file, next);
    return next;
}

export async function addRecentProject(
    file: string,
    entry: RecentProject
): Promise<RecentProject[]> {
    const next = mergeRecent(await readRecentProjects(file), entry);
    await writeRecentProjects(file, next);
    return next;
}
