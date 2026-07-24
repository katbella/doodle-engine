import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DOODLE_PACKAGE_PREFIX = '@doodle-engine/';

/**
 * Pin every Doodle dependency already used by a project to one version.
 * The following package-manager install updates the lockfile and node_modules.
 */
export async function pinDoodlePackages(
    projectDir: string,
    version: string
): Promise<string[]> {
    const packagePath = join(projectDir, 'package.json');
    const source = await readFile(packagePath, 'utf-8');
    const pkg = JSON.parse(source) as Record<string, unknown>;
    const updated: string[] = [];

    for (const sectionName of ['dependencies', 'devDependencies'] as const) {
        const section = pkg[sectionName];
        if (!section || typeof section !== 'object' || Array.isArray(section)) {
            continue;
        }
        for (const name of Object.keys(section)) {
            if (!name.startsWith(DOODLE_PACKAGE_PREFIX)) continue;
            (section as Record<string, string>)[name] = version;
            updated.push(name);
        }
    }

    if (updated.length === 0) {
        throw new Error(
            'This project does not declare any Doodle Engine packages.'
        );
    }

    const indentation = source.match(/^[\t ]+(?=")/m)?.[0] ?? '  ';
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const trailingEol = source.endsWith('\n') ? eol : '';
    const output =
        JSON.stringify(pkg, null, indentation).replaceAll('\n', eol) +
        trailingEol;
    await writeFile(packagePath, output, 'utf-8');
    return updated;
}
