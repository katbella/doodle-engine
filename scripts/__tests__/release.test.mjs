import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
    RELEASE_PACKAGES,
    bumpVersion,
    checkNpmLatestVersions,
    compareVersions,
    decideRelease,
    latestCompletedStudioVersion,
    parseReleaseCommit,
    parseVersion,
    releaseCommitMessage,
    sharedManifestVersion,
    validatePackedPackage,
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
    assert.deepEqual(
        decideRelease({
            manifestVersion: '0.2.2',
            completedVersion: '0.2.2',
            bump: 'minor',
        }),
        {
            mode: 'create',
            version: '0.3.0',
            releaseSha: null,
        }
    );
});

test('resumes the version already committed after a failed release', () => {
    assert.deepEqual(
        decideRelease({
            manifestVersion: '0.2.3',
            completedVersion: '0.2.2',
            bump: 'major',
            pendingCommit: 'abc123',
        }),
        {
            mode: 'resume',
            version: '0.2.3',
            releaseSha: 'abc123',
        }
    );
});

test('rerunning the same completed workflow does not increment again', () => {
    assert.deepEqual(
        decideRelease({
            manifestVersion: '0.2.3',
            completedVersion: '0.2.3',
            bump: 'patch',
            sameRunCommit: 'abc123',
        }),
        {
            mode: 'resume',
            version: '0.2.3',
            releaseSha: 'abc123',
        }
    );
});

test('rerunning an older workflow cannot start a newer release', () => {
    assert.deepEqual(
        decideRelease({
            manifestVersion: '0.4.0',
            completedVersion: '0.4.0',
            bump: 'major',
            sameRunCommit: 'old123',
            sameRunVersion: '0.3.0',
        }),
        {
            mode: 'resume',
            version: '0.3.0',
            releaseSha: 'old123',
        }
    );
});

test('rejects unexplained manifest and release differences', () => {
    assert.throws(
        () =>
            decideRelease({
                manifestVersion: '0.2.3',
                completedVersion: '0.2.2',
                bump: 'patch',
            }),
        /no matching release commit/
    );
    assert.throws(
        () =>
            decideRelease({
                manifestVersion: '0.2.1',
                completedVersion: '0.2.2',
                bump: 'patch',
            }),
        /behind/
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

test('creates and reads the automated release commit message', () => {
    const message = releaseCommitMessage('0.3.0', '12345');
    assert.equal(message, 'Release Doodle 0.3.0\n\nDoodle-Release-Run: 12345');
    assert.deepEqual(parseReleaseCommit(message), {
        version: '0.3.0',
        runId: '12345',
    });
    assert.equal(parseReleaseCommit('Release Doodle 0.3.0'), null);
    assert.equal(parseReleaseCommit('feat: not a release'), null);
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
            release: false,
            docs: false,
        }
    );
});
