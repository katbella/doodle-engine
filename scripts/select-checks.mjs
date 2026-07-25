import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseReleaseBranch } from './release.mjs';

const SHARED_BUILD_FILE =
    /^(package\.json|yarn\.lock|\.yarnrc\.yml|tsconfig[^/]*\.json)$/;
const STUDIO_E2E_PATH = /^packages\/(studio|core|toolkit)\//;
const PACKAGE_MANIFEST = /^packages\/[^/]+\/package\.json$/;

export function selectChecks(paths, { branch = '' } = {}) {
    if (parseReleaseBranch(branch)) {
        return {
            product: true,
            studio_e2e: true,
            release: true,
            docs: false,
        };
    }

    const changed = paths
        .map((path) => path.trim().replaceAll('\\', '/'))
        .filter(Boolean);
    const shared = changed.some((path) => SHARED_BUILD_FILE.test(path));
    const some = (predicate) => shared || changed.some(predicate);

    return {
        product: some((path) => path.startsWith('packages/')),
        studio_e2e: some((path) => STUDIO_E2E_PATH.test(path)),
        release: some(
            (path) =>
                path.startsWith('.github/workflows/') ||
                path.startsWith('scripts/') ||
                PACKAGE_MANIFEST.test(path)
        ),
        docs: changed.some((path) => path.startsWith('docs/')),
    };
}

function changedFiles(baseSha, headSha) {
    const range = `${baseSha}...${headSha}`;
    const result = spawnSync('git', ['diff', '--name-only', range], {
        encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`git diff ${range} failed:\n${result.stderr.trim()}`);
    }
    return result.stdout.split(/\r?\n/);
}

function main() {
    const { BASE_SHA, HEAD_SHA, HEAD_REF } = process.env;
    const checks =
        BASE_SHA && HEAD_SHA
            ? selectChecks(changedFiles(BASE_SHA, HEAD_SHA), {
                  branch: HEAD_REF ?? '',
              })
            : { product: true, studio_e2e: true, release: true, docs: true };

    for (const [name, value] of Object.entries(checks)) {
        const line = `${name}=${value}`;
        console.log(line);
        if (process.env.GITHUB_OUTPUT) {
            appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
        }
    }
}

if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    try {
        main();
    } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}
