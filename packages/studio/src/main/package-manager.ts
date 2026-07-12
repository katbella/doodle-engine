/**
 * Detecting a project's package manager.
 *
 * When a project's dependencies aren't installed, Studio offers to install them
 * so a writer never has to drop to a terminal. It runs whichever package manager
 * the project already uses, inferred from its lockfile, so it doesn't create a
 * second lockfile or fight the one that's there.
 */

import { readdir } from 'fs/promises';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Pick a package manager from a directory listing by its lockfile. Yarn and
 * pnpm are chosen only when their lockfile is present; everything else (a
 * package-lock.json, or no lockfile at all) uses npm, the safe default that
 * ships with Node.
 */
export function packageManagerFromLockfiles(
    filenames: string[]
): PackageManager {
    const present = new Set(filenames);
    if (present.has('yarn.lock')) return 'yarn';
    if (present.has('pnpm-lock.yaml')) return 'pnpm';
    return 'npm';
}

/** Read a project folder and infer its package manager from the lockfile. */
export async function detectPackageManager(
    projectDir: string
): Promise<PackageManager> {
    try {
        return packageManagerFromLockfiles(await readdir(projectDir));
    } catch {
        return 'npm';
    }
}
