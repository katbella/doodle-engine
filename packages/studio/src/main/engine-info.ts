import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { detectPackageManager } from './package-manager';
import type { EngineInfo } from '../shared/project';

async function readJson(path: string): Promise<Record<string, unknown> | null> {
    try {
        return JSON.parse(await readFile(path, 'utf-8'));
    } catch {
        return null;
    }
}

async function isDirectory(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Report which Doodle Engine version a project targets and whether its
 * dependencies are installed. Studio parses content with its own bundled
 * engine, but the built game runs on the version installed here, so surfacing
 * this lets the app warn about a mismatch and about a build that would fail for
 * lack of installed dependencies.
 */
export async function readEngineInfo(projectDir: string): Promise<EngineInfo> {
    const pkg = await readJson(join(projectDir, 'package.json'));
    const deps = (pkg?.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg?.devDependencies ?? {}) as Record<string, string>;
    const declared =
        deps['@doodle-engine/core'] ?? devDeps['@doodle-engine/core'] ?? null;

    const installedPkg = await readJson(
        join(
            projectDir,
            'node_modules',
            '@doodle-engine',
            'core',
            'package.json'
        )
    );
    const installed =
        typeof installedPkg?.version === 'string' ? installedPkg.version : null;

    const depsInstalled = await isDirectory(join(projectDir, 'node_modules'));
    const packageManager = await detectPackageManager(projectDir);

    return { declared, installed, depsInstalled, packageManager };
}
