// Loads a package from the opened project, using its ESM entry so it works from
// Studio's CommonJS build/preview worker.

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface PackageManifest {
    name?: string;
    exports?: unknown;
    module?: string;
    main?: string;
}

/** Find a dependency's own folder by resolving it from the project, then walking
 * up to the package.json that actually names it. */
function packageRoot(
    projectDir: string,
    moduleName: string
): { dir: string; pkg: PackageManifest } {
    const projectRequire = createRequire(join(projectDir, 'package.json'));
    let dir = dirname(projectRequire.resolve(moduleName));
    for (;;) {
        const manifest = join(dir, 'package.json');
        if (existsSync(manifest)) {
            const pkg = JSON.parse(
                readFileSync(manifest, 'utf8')
            ) as PackageManifest;
            if (pkg.name === moduleName) return { dir, pkg };
        }
        const parent = dirname(dir);
        if (parent === dir) {
            throw new Error(`Could not locate ${moduleName} in ${projectDir}`);
        }
        dir = parent;
    }
}

/** The package's ESM entry file, following its "exports" import condition. */
export function esmEntry(pkg: PackageManifest): string {
    const pick = (value: unknown): string | undefined => {
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            const conditions = value as Record<string, unknown>;
            return pick(
                conditions.import ??
                    conditions.module ??
                    conditions.node ??
                    conditions.default
            );
        }
        return undefined;
    };
    const { exports } = pkg;
    const dot =
        exports && typeof exports === 'object' && !Array.isArray(exports)
            ? ((exports as Record<string, unknown>)['.'] ?? exports)
            : exports;
    return pick(dot) ?? pkg.module ?? pkg.main ?? 'index.js';
}

export async function importFromProject<T = unknown>(
    projectDir: string,
    moduleName: string
): Promise<T> {
    const { dir, pkg } = packageRoot(projectDir, moduleName);
    const entry = pathToFileURL(join(dir, esmEntry(pkg))).href;
    return import(entry) as Promise<T>;
}
