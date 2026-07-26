import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
    RELEASE_MANIFEST_PATHS,
    RELEASE_PACKAGES,
    bumpVersion,
    checkNpmLatestVersions,
    compareVersions,
    decideReleaseVersion,
    latestCompletedStudioVersion,
    normalizeReleaseSummary,
    parseReleaseBranch,
    parseReleaseSummary,
    parseReleaseTitle,
    parseVersion,
    releaseBranch,
    releaseBumpKind,
    releasePullRequestBody,
    releaseTitle,
    sharedManifestVersion,
    validatePackedPackage,
    validateReleasePullRequest,
    writeReleaseVersion,
} from '../release.mjs';
import { selectChecks } from '../select-checks.mjs';

async function releaseFixture(versions) {
    const root = await mkdtemp(join(tmpdir(), 'doodle-release-test-'));
    await Promise.all(
        RELEASE_PACKAGES.map(async (pkg, index) => {
            const directory = join(root, pkg.directory);
            await mkdir(directory, { recursive: true });
            await writeFile(
                join(directory, 'package.json'),
                JSON.stringify({
                    name: pkg.name,
                    version: versions[index] ?? versions[0],
                })
            );
        })
    );
    return root;
}

test('parses, compares, and bumps stable versions', () => {
    assert.deepEqual(parseVersion('1.2.3'), {
        major: 1,
        minor: 2,
        patch: 3,
    });
    assert.equal(compareVersions('1.2.3', '1.2.2'), 1);
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
    assert.equal(compareVersions('1.2.3', '2.0.0'), -1);
    assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
    assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
    assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
    assert.throws(() => parseVersion('1.2.3-beta.1'), /stable version/);
    assert.throws(() => bumpVersion('1.2.3', 'banana'), /Unknown/);
});

test('starts one new version from the completed release', () => {
    assert.equal(
        decideReleaseVersion({
            manifestVersion: '0.2.2',
            completedVersion: '0.2.2',
            bump: 'minor',
        }),
        '0.3.0'
    );
    assert.equal(
        decideReleaseVersion({
            manifestVersion: '0.2.2',
            completedVersion: '0.2.2',
            bump: 'patch',
        }),
        '0.2.3'
    );
});

test('refuses to start a release while another one is unfinished', () => {
    assert.throws(
        () =>
            decideReleaseVersion({
                manifestVersion: '0.2.3',
                completedVersion: '0.2.2',
                bump: 'patch',
            }),
        /ahead of the completed release/
    );
    assert.throws(
        () =>
            decideReleaseVersion({
                manifestVersion: '0.2.1',
                completedVersion: '0.2.2',
                bump: 'patch',
            }),
        /behind/
    );
});

test('names the release branch and pull request after the version', () => {
    assert.equal(releaseBranch('0.3.0'), 'release/doodle-0.3.0');
    assert.equal(releaseTitle('0.3.0'), 'Release Doodle Engine 0.3.0');
    assert.equal(parseReleaseBranch('release/doodle-0.3.0'), '0.3.0');
    assert.equal(parseReleaseTitle('Release Doodle Engine 0.3.0'), '0.3.0');
    assert.equal(parseReleaseBranch('feature/release-notes'), null);
    assert.equal(parseReleaseBranch('release/doodle-latest'), null);
    assert.equal(parseReleaseTitle('chore: Release Doodle Engine 0.3.0'), null);
    assert.equal(parseReleaseTitle('Release Doodle Engine 0.3.0-beta.1'), null);
    assert.equal(parseReleaseBranch(''), null);
    assert.equal(parseReleaseBranch(undefined), null);
});

test('stores the release summary in the release pull request', () => {
    const summary = normalizeReleaseSummary(
        `  ${'A detailed release summary '.repeat(12)}
        with its full ending.  `
    );
    const body = releasePullRequestBody('0.3.0', '0.2.9', summary);

    assert.ok(summary.length > 200);
    assert.equal(parseReleaseSummary(body), summary);
    assert.match(body, /^## Release summary\n\nA detailed release summary/);
    assert.match(body, /\n\n## Release details\n/);
    assert.throws(() => normalizeReleaseSummary(' \n '), /must not be empty/);
    assert.throws(
        () => parseReleaseSummary('## Release details\n\nNo summary here.'),
        /missing its release summary/
    );
});

test('recognizes patch, minor, and major increments only', () => {
    assert.equal(releaseBumpKind('0.2.2', '0.2.3'), 'patch');
    assert.equal(releaseBumpKind('0.2.2', '0.3.0'), 'minor');
    assert.equal(releaseBumpKind('0.2.2', '1.0.0'), 'major');
    assert.equal(releaseBumpKind('0.2.2', '0.2.5'), null);
    assert.equal(releaseBumpKind('0.2.2', '0.4.0'), null);
    assert.equal(releaseBumpKind('0.2.2', '1.0.1'), null);
    assert.equal(releaseBumpKind('0.2.2', '0.2.2'), null);
    assert.equal(releaseBumpKind('0.2.2', '0.2.1'), null);
});

function releaseManifests({
    previousVersion = '0.2.9',
    version = '0.3.0',
    change = () => ({}),
} = {}) {
    return RELEASE_PACKAGES.map((pkg, index) => {
        const before = {
            name: pkg.name,
            version: previousVersion,
            scripts: { build: 'vite build' },
            dependencies: { '@doodle-engine/core': 'workspace:*' },
        };
        return {
            name: pkg.name,
            before,
            after: {
                ...before,
                version,
                ...change(pkg, index),
            },
        };
    });
}

function releasePullRequest(overrides = {}) {
    return {
        merged: true,
        baseRef: 'main',
        branch: 'release/doodle-0.3.0',
        title: 'Release Doodle Engine 0.3.0',
        changedFiles: [...RELEASE_MANIFEST_PATHS],
        manifests: releaseManifests(),
        ...overrides,
    };
}

test('accepts a merged release pull request that only changes the version', () => {
    assert.deepEqual(validateReleasePullRequest(releasePullRequest()), {
        version: '0.3.0',
        previousVersion: '0.2.9',
    });
});

test('only a merged release pull request into main can publish', () => {
    assert.throws(
        () => validateReleasePullRequest(releasePullRequest({ merged: false })),
        /Only a merged release pull request/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({ baseRef: 'develop' })
            ),
        /expected "main"/
    );
});

test('an ordinary pull request is never treated as a release', () => {
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({ branch: 'feature/dialogue-notes' })
            ),
        /not a Doodle Engine release branch/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({ title: 'chore: bump versions' })
            ),
        /does not match Release Doodle Engine 0\.3\.0/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    branch: 'release/doodle-0.4.0',
                    title: 'Release Doodle Engine 0.3.0',
                })
            ),
        /does not match Release Doodle Engine 0\.4\.0/
    );
});

test('a release pull request may change only the five package manifests', () => {
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    changedFiles: [
                        ...RELEASE_MANIFEST_PATHS,
                        'packages/core/src/index.ts',
                    ],
                })
            ),
        /only change the five package manifests/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    changedFiles: RELEASE_MANIFEST_PATHS.slice(1),
                })
            ),
        /only change the five package manifests/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({ changedFiles: ['yarn.lock'] })
            ),
        /only change the five package manifests/
    );
});

test('rejects dependency, script, and metadata changes inside a manifest', () => {
    const changes = [
        () => ({ dependencies: { '@doodle-engine/core': '^9.9.9' } }),
        () => ({ scripts: { build: 'rm -rf /' } }),
        () => ({ description: 'a new description' }),
        (pkg, index) => (index === 0 ? { private: true } : {}),
    ];
    for (const change of changes) {
        assert.throws(
            () =>
                validateReleasePullRequest(
                    releasePullRequest({
                        manifests: releaseManifests({ change }),
                    })
                ),
            /changed more than its version field/
        );
    }
});

test('every package manifest must reach the same release version', () => {
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    manifests: releaseManifests({
                        change: (pkg, index) =>
                            index === 2 ? { version: '0.2.9' } : {},
                    }),
                })
            ),
        /toolkit is at 0\.2\.9, expected 0\.3\.0/
    );
    const mixed = releaseManifests();
    mixed[1].before = { ...mixed[1].before, version: '0.2.8' };
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({ manifests: mixed })
            ),
        /did not share one version/
    );
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    manifests: releaseManifests().slice(1),
                })
            ),
        /Expected 5 package manifests/
    );
});

test('the release version must be one patch, minor, or major step', () => {
    assert.throws(
        () =>
            validateReleasePullRequest(
                releasePullRequest({
                    branch: 'release/doodle-0.9.0',
                    title: 'Release Doodle Engine 0.9.0',
                    manifests: releaseManifests({ version: '0.9.0' }),
                })
            ),
        /is not a patch, minor, or major increment/
    );
});

test('writes the same version to all five manifests', async (context) => {
    const root = await releaseFixture(['0.2.2']);
    context.after(() => rm(root, { recursive: true, force: true }));

    writeReleaseVersion('0.3.0', root);
    assert.equal(sharedManifestVersion(root), '0.3.0');

    for (const pkg of RELEASE_PACKAGES) {
        const manifest = JSON.parse(
            await readFile(join(root, pkg.directory, 'package.json'), 'utf8')
        );
        assert.equal(manifest.version, '0.3.0');
    }
});

test('reports package versions that are not in lockstep', async (context) => {
    const root = await releaseFixture([
        '0.2.2',
        '0.2.2',
        '0.2.1',
        '0.2.2',
        '0.2.2',
    ]);
    context.after(() => rm(root, { recursive: true, force: true }));
    assert.throws(() => sharedManifestVersion(root), /toolkit: 0.2.1/);
});

test('finds the latest completed Studio release', () => {
    assert.equal(
        latestCompletedStudioVersion([
            {
                tag_name: '@doodle-engine/studio@0.2.2',
                draft: false,
                prerelease: false,
            },
            {
                tag_name: '@doodle-engine/studio@0.3.0',
                draft: true,
                prerelease: false,
            },
            {
                tag_name: '@doodle-engine/core@9.0.0',
                draft: false,
                prerelease: false,
            },
            {
                tag_name: '@doodle-engine/studio@0.2.10',
                draft: false,
                prerelease: false,
            },
        ]),
        '0.2.10'
    );
});

test('rejects published npm versions that disagree with the release state', () => {
    const published = [
        ['@doodle-engine/core', '0.2.2'],
        ['@doodle-engine/react', '0.2.2'],
        ['@doodle-engine/toolkit', '0.2.1'],
        ['@doodle-engine/cli', '0.2.2'],
    ];
    assert.throws(
        () => checkNpmLatestVersions(published, ['0.2.2']),
        /toolkit: 0.2.1/
    );
    assert.doesNotThrow(() =>
        checkNpmLatestVersions(published, ['0.2.2', '0.2.1'])
    );
});

test('checks packed package versions, dependencies, and public files', () => {
    const manifest = {
        name: '@doodle-engine/react',
        version: '0.3.0',
        main: './dist/react.cjs',
        module: './dist/react.js',
        types: './dist/index.d.ts',
        exports: {
            './style.css': './dist/shell.css',
        },
        dependencies: {
            '@doodle-engine/core': '0.3.0',
        },
    };
    const entries = [
        'package/package.json',
        'package/dist/react.cjs',
        'package/dist/react.js',
        'package/dist/index.d.ts',
        'package/dist/shell.css',
    ];
    assert.doesNotThrow(() =>
        validatePackedPackage(
            manifest,
            entries,
            '@doodle-engine/react',
            '0.3.0'
        )
    );
    assert.throws(
        () =>
            validatePackedPackage(
                {
                    ...manifest,
                    dependencies: {
                        '@doodle-engine/core': 'workspace:*',
                    },
                },
                entries,
                '@doodle-engine/react',
                '0.3.0'
            ),
        /workspace:/
    );
    assert.throws(
        () =>
            validatePackedPackage(
                manifest,
                entries.filter((entry) => entry !== 'package/dist/react.js'),
                '@doodle-engine/react',
                '0.3.0'
            ),
        /missing dist\/react.js/
    );
});

test('selects the checks a change needs', () => {
    assert.deepEqual(selectChecks(['packages/react/src/index.ts']), {
        product: true,
        studio_e2e: false,
        release: false,
        docs: false,
    });
    assert.deepEqual(selectChecks(['packages/core/src/index.ts']), {
        product: true,
        studio_e2e: true,
        release: false,
        docs: false,
    });
    assert.deepEqual(selectChecks(['.github/workflows/release.yml']), {
        product: false,
        studio_e2e: false,
        release: true,
        docs: false,
    });
    assert.deepEqual(selectChecks(['packages/core/package.json']), {
        product: true,
        studio_e2e: true,
        release: true,
        docs: false,
    });
    assert.deepEqual(selectChecks(['docs/src/content/docs/index.mdx']), {
        product: false,
        studio_e2e: false,
        release: false,
        docs: true,
    });
    assert.deepEqual(selectChecks(['yarn.lock']), {
        product: true,
        studio_e2e: true,
        release: true,
        docs: false,
    });
    assert.deepEqual(selectChecks(['README.md']), {
        product: false,
        studio_e2e: false,
        release: false,
        docs: false,
    });
    assert.deepEqual(
        selectChecks(['extensions/vscode-dlg/syntaxes/dlg.tmLanguage.json']),
        {
            product: false,
            studio_e2e: false,
            release: true,
            docs: false,
        }
    );
    assert.equal(
        selectChecks(['packages/studio/resources/icon.png']).release,
        true
    );
});

test('a release pull request runs the whole Ubuntu suite without docs', () => {
    assert.deepEqual(
        selectChecks(RELEASE_MANIFEST_PATHS, {
            branch: 'release/doodle-0.3.0',
        }),
        {
            product: true,
            studio_e2e: true,
            release: true,
            docs: false,
        }
    );
    assert.deepEqual(
        selectChecks(['docs/src/content/docs/index.mdx'], {
            branch: 'release/doodle-0.3.0',
        }),
        {
            product: true,
            studio_e2e: true,
            release: true,
            docs: false,
        }
    );
    assert.deepEqual(selectChecks(['README.md'], { branch: 'feature/notes' }), {
        product: false,
        studio_e2e: false,
        release: false,
        docs: false,
    });
});
