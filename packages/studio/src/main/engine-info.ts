import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { detectPackageManager } from './package-manager';
import type { EngineInfo } from '../shared/project';
import { compareVersions, parseVersion } from './studio-release';

const DOODLE_PACKAGE_PREFIX = '@doodle-engine/';

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
function canReplaceWithRegistryVersion(specifier: string): boolean {
    return !/^(?:workspace|file|link|portal|git|https?):/i.test(specifier);
}

export async function readEngineInfo(
    projectDir: string,
    currentVersion: string
): Promise<EngineInfo> {
    const pkg = await readJson(join(projectDir, 'package.json'));
    const deps = (pkg?.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg?.devDependencies ?? {}) as Record<string, string>;
    const doodlePackages = Object.entries({ ...deps, ...devDeps }).filter(
        ([name]) => name.startsWith(DOODLE_PACKAGE_PREFIX)
    );
    const declared =
        deps['@doodle-engine/core'] ?? devDeps['@doodle-engine/core'] ?? null;

    const installedVersions = new Map<string, string>();
    for (const [name] of doodlePackages) {
        const installedPkg = await readJson(
            join(projectDir, 'node_modules', ...name.split('/'), 'package.json')
        );
        if (typeof installedPkg?.version === 'string') {
            installedVersions.set(name, installedPkg.version);
        }
    }
    const installed =
        installedVersions.get('@doodle-engine/core') ??
        installedVersions.values().next().value ??
        null;

    const depsInstalled = await isDirectory(join(projectDir, 'node_modules'));
    const packageManager = await detectPackageManager(projectDir);
    const distinctVersions = new Set(installedVersions.values());
    const versionMismatch =
        distinctVersions.size > 1 ||
        (depsInstalled && installedVersions.size < doodlePackages.length);
    const current = parseVersion(currentVersion);
    const parsedInstalled = [...installedVersions.values()].map(parseVersion);
    const hasOlderVersion =
        current !== null &&
        parsedInstalled.some(
            (version) =>
                version !== null &&
                (compareVersions(version, current) < 0 ||
                    (compareVersions(version, current) === 0 &&
                        version.prerelease !== null &&
                        current.prerelease === null))
        );
    const updateAvailable =
        depsInstalled &&
        doodlePackages.length > 0 &&
        doodlePackages.every(([, specifier]) =>
            canReplaceWithRegistryVersion(specifier)
        ) &&
        current !== null &&
        parsedInstalled.every(
            (version) =>
                version !== null && compareVersions(version, current) <= 0
        ) &&
        (installedVersions.size < doodlePackages.length || hasOlderVersion);

    return {
        declared,
        installed,
        current: currentVersion,
        updateAvailable,
        versionMismatch,
        depsInstalled,
        packageManager,
    };
}
