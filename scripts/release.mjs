import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    appendFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RELEASE_PACKAGES = [
    {
        name: '@doodle-engine/core',
        directory: 'packages/core',
        public: true,
    },
    {
        name: '@doodle-engine/react',
        directory: 'packages/react',
        public: true,
    },
    {
        name: '@doodle-engine/toolkit',
        directory: 'packages/toolkit',
        public: true,
    },
    {
        name: '@doodle-engine/cli',
        directory: 'packages/cli',
        public: true,
    },
    {
        name: '@doodle-engine/studio',
        directory: 'packages/studio',
        public: false,
    },
];

const STUDIO_PACKAGE = RELEASE_PACKAGES.at(-1);
const STUDIO_TAG_PREFIX = `${STUDIO_PACKAGE.name}@`;
const RELEASE_SUBJECT_PREFIX = 'Release Doodle Engine ';
const RELEASE_BRANCH_PREFIX = 'release/doodle-';
const RELEASE_BASE_BRANCH = 'main';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const RELEASE_MANIFEST_PATHS = RELEASE_PACKAGES.map(
    ({ directory }) => `${directory}/package.json`
);

export function runCommand(
    command,
    args,
    { cwd = ROOT, allowFailure = false } = {}
) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.error) throw result.error;
    if (result.status !== 0 && !allowFailure) {
        const detail = [result.stdout, result.stderr]
            .filter(Boolean)
            .join('\n')
            .trim();
        throw new Error(
            `${command} ${args.join(' ')} failed with exit code ${result.status}${
                detail ? `\n${detail}` : ''
            }`
        );
    }
    return result;
}

export function parseVersion(value) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
    if (!match) {
        throw new Error(
            `Expected a stable version such as 0.3.0, received "${value}".`
        );
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}

export function compareVersions(left, right) {
    const a = typeof left === 'string' ? parseVersion(left) : left;
    const b = typeof right === 'string' ? parseVersion(right) : right;
    return (
        Math.sign(a.major - b.major) ||
        Math.sign(a.minor - b.minor) ||
        Math.sign(a.patch - b.patch)
    );
}

export function bumpVersion(version, bump) {
    const parsed = parseVersion(version);
    if (bump === 'major') return `${parsed.major + 1}.0.0`;
    if (bump === 'minor') return `${parsed.major}.${parsed.minor + 1}.0`;
    if (bump === 'patch')
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    throw new Error(`Unknown release bump "${bump}".`);
}

export function decideReleaseVersion({
    manifestVersion,
    completedVersion,
    bump,
}) {
    const relation = compareVersions(manifestVersion, completedVersion);

    if (relation === 1) {
        throw new Error(
            `The manifests are at ${manifestVersion}, ahead of the completed release ` +
                `${completedVersion}. Finish or undo that release before starting another.`
        );
    }

    if (relation === -1) {
        throw new Error(
            `The manifests are at ${manifestVersion}, behind the completed release ` +
                `${completedVersion}.`
        );
    }

    return bumpVersion(manifestVersion, bump);
}

export function readReleaseManifests(root = ROOT) {
    return RELEASE_PACKAGES.map((pkg) => {
        const path = join(root, pkg.directory, 'package.json');
        return {
            ...pkg,
            path,
            manifest: JSON.parse(readFileSync(path, 'utf8')),
        };
    });
}

export function sharedManifestVersion(root = ROOT) {
    const manifests = readReleaseManifests(root);
    const versions = new Set(manifests.map(({ manifest }) => manifest.version));
    if (versions.size !== 1) {
        const details = manifests
            .map(({ name, manifest }) => `${name}: ${manifest.version}`)
            .join('\n');
        throw new Error(
            `Doodle Engine package versions do not match:\n${details}`
        );
    }
    const version = manifests[0].manifest.version;
    parseVersion(version);
    return version;
}

export function writeReleaseVersion(version, root = ROOT) {
    parseVersion(version);
    for (const { path, manifest } of readReleaseManifests(root)) {
        manifest.version = version;
        writeFileSync(path, `${JSON.stringify(manifest, null, 4)}\n`);
    }
}

export function releaseBranch(version) {
    parseVersion(version);
    return `${RELEASE_BRANCH_PREFIX}${version}`;
}

export function releaseTitle(version) {
    parseVersion(version);
    return `${RELEASE_SUBJECT_PREFIX}${version}`;
}

function parseVersionAfter(value, prefix) {
    if (typeof value !== 'string' || !value.startsWith(prefix)) return null;
    const version = value.slice(prefix.length);
    try {
        parseVersion(version);
    } catch {
        return null;
    }
    return version;
}

export function parseReleaseBranch(branch) {
    return parseVersionAfter(branch, RELEASE_BRANCH_PREFIX);
}

export function parseReleaseTitle(title) {
    return parseVersionAfter(title, RELEASE_SUBJECT_PREFIX);
}

export function releaseBumpKind(previousVersion, version) {
    const previous = parseVersion(previousVersion);
    const next = parseVersion(version);
    if (
        next.major === previous.major + 1 &&
        next.minor === 0 &&
        next.patch === 0
    ) {
        return 'major';
    }
    if (
        next.major === previous.major &&
        next.minor === previous.minor + 1 &&
        next.patch === 0
    ) {
        return 'minor';
    }
    if (
        next.major === previous.major &&
        next.minor === previous.minor &&
        next.patch === previous.patch + 1
    ) {
        return 'patch';
    }
    return null;
}

function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value ?? null);
}

export function validateReleasePullRequest({
    merged,
    baseRef,
    branch,
    title,
    changedFiles,
    manifests,
}) {
    if (merged !== true) {
        throw new Error('Only a merged release pull request may publish.');
    }
    if (baseRef !== RELEASE_BASE_BRANCH) {
        throw new Error(
            `The release pull request merged into "${baseRef}", expected "${RELEASE_BASE_BRANCH}".`
        );
    }

    const version = parseReleaseBranch(branch);
    if (!version) {
        throw new Error(
            `"${branch}" is not a Doodle Engine release branch such as ${RELEASE_BRANCH_PREFIX}0.3.0.`
        );
    }

    const titleVersion = parseReleaseTitle(title);
    if (titleVersion !== version) {
        throw new Error(
            `The pull request title "${title}" does not match ${releaseTitle(version)}.`
        );
    }

    const changed = [...new Set(changedFiles.map((path) => path.trim()))]
        .filter(Boolean)
        .sort();
    const expected = [...RELEASE_MANIFEST_PATHS].sort();
    if (changed.join('\n') !== expected.join('\n')) {
        throw new Error(
            `A release pull request may only change the five package manifests.\n` +
                `Changed:\n${changed.join('\n') || '(nothing)'}`
        );
    }

    const previousVersions = new Set();
    for (const { name, before, after } of manifests) {
        if (!before || !after) {
            throw new Error(`${name} does not have a manifest on both sides.`);
        }
        if (after.version !== version) {
            throw new Error(
                `${name} is at ${after.version}, expected ${version}.`
            );
        }
        if (
            stableJson({ ...before, version }) !==
            stableJson({ ...after, version })
        ) {
            throw new Error(
                `${name} changed more than its version field in the release pull request.`
            );
        }
        previousVersions.add(before.version);
    }

    if (manifests.length !== RELEASE_PACKAGES.length) {
        throw new Error(
            `Expected ${RELEASE_PACKAGES.length} package manifests, received ${manifests.length}.`
        );
    }
    if (previousVersions.size !== 1) {
        throw new Error(
            `The manifests did not share one version before the release: ${[
                ...previousVersions,
            ].join(', ')}.`
        );
    }

    const previousVersion = [...previousVersions][0];
    if (!releaseBumpKind(previousVersion, version)) {
        throw new Error(
            `${version} is not a patch, minor, or major increment of ${previousVersion}.`
        );
    }

    return { version, previousVersion };
}

function gitOutput(args, options = {}) {
    return runCommand('git', args, options).stdout.trim();
}

function tagCommit(tag, root = ROOT) {
    const result = runCommand(
        'git',
        ['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`],
        { cwd: root, allowFailure: true }
    );
    return result.status === 0 ? result.stdout.trim() : null;
}

async function githubReleases(repository, token, fetchImpl = fetch) {
    const response = await fetchImpl(
        `https://api.github.com/repos/${repository}/releases?per_page=100`,
        {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`,
                'User-Agent': 'doodle-release',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        }
    );
    if (!response.ok) {
        throw new Error(
            `GitHub returned ${response.status} while reading releases.`
        );
    }
    const releases = await response.json();
    if (!Array.isArray(releases)) {
        throw new Error('GitHub returned an unreadable release list.');
    }
    return releases;
}

export function latestCompletedStudioVersion(releases) {
    const versions = releases
        .filter((release) => !release.draft && !release.prerelease)
        .map((release) =>
            String(release.tag_name ?? '').startsWith(STUDIO_TAG_PREFIX)
                ? String(release.tag_name).slice(STUDIO_TAG_PREFIX.length)
                : null
        )
        .filter(Boolean)
        .filter((version) => {
            try {
                parseVersion(version);
                return true;
            } catch {
                return false;
            }
        })
        .sort(compareVersions);
    const latest = versions.at(-1);
    if (!latest) {
        throw new Error(
            `No completed ${STUDIO_TAG_PREFIX}<version> GitHub release was found.`
        );
    }
    return latest;
}

function npmRegistryUrl(name, version) {
    return `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
}

async function npmPackageMetadata(
    name,
    version,
    fetchImpl = fetch,
    { allowMissing = false } = {}
) {
    const response = await fetchImpl(npmRegistryUrl(name, version));
    if (response.status === 404 && allowMissing) return null;
    if (!response.ok) {
        throw new Error(
            `npm returned ${response.status} for ${name}@${version}.`
        );
    }
    return response.json();
}

async function npmLatestVersions(fetchImpl) {
    return Promise.all(
        RELEASE_PACKAGES.filter((pkg) => pkg.public).map(async ({ name }) => {
            const metadata = await npmPackageMetadata(
                name,
                'latest',
                fetchImpl
            );
            return [name, metadata.version];
        })
    );
}

export function checkNpmLatestVersions(npmVersions, allowedVersions) {
    const mismatches = npmVersions.filter(
        ([, publishedVersion]) => !allowedVersions.includes(publishedVersion)
    );
    if (mismatches.length) {
        throw new Error(
            `Published npm versions do not match the release state:\n${mismatches
                .map(([name, published]) => `${name}: ${published}`)
                .join('\n')}`
        );
    }
}

function verifyCompletedTags(version, root) {
    const tagCommits = RELEASE_PACKAGES.map(({ name }) => {
        const tag = `${name}@${version}`;
        return [tag, tagCommit(tag, root)];
    });
    const missing = tagCommits.filter(([, commit]) => !commit);
    if (missing.length) {
        throw new Error(
            `Missing release tags:\n${missing.map(([tag]) => tag).join('\n')}`
        );
    }
    if (new Set(tagCommits.map(([, commit]) => commit)).size !== 1) {
        throw new Error(
            `The ${version} package tags do not point to one commit.`
        );
    }
}

async function verifyTargetIsUnused(version, root, fetchImpl) {
    for (const { name, public: isPublic } of RELEASE_PACKAGES) {
        const tag = `${name}@${version}`;
        if (tagCommit(tag, root)) {
            throw new Error(`Release tag ${tag} already exists.`);
        }
        if (
            isPublic &&
            (await npmPackageMetadata(name, version, fetchImpl, {
                allowMissing: true,
            }))
        ) {
            throw new Error(`${name}@${version} already exists on npm.`);
        }
    }
}

function verifyTagsMatchCommit(version, releaseSha, root) {
    for (const { name } of RELEASE_PACKAGES) {
        const tag = `${name}@${version}`;
        const existingCommit = tagCommit(tag, root);
        if (existingCommit && existingCommit !== releaseSha) {
            throw new Error(
                `${tag} points to ${existingCommit}, expected ${releaseSha}.`
            );
        }
    }
}

function writeActionsOutput(values) {
    const output = process.env.GITHUB_OUTPUT;
    for (const [key, value] of Object.entries(values)) {
        console.log(`${key}=${value}`);
        if (output) appendFileSync(output, `${key}=${value}\n`);
    }
}

async function prepareRelease(options) {
    const bump = requiredOption(options, 'bump');
    const repository = process.env.GITHUB_REPOSITORY;
    const token = process.env.GITHUB_TOKEN;
    if (!repository || !token) {
        throw new Error(
            'GITHUB_REPOSITORY and GITHUB_TOKEN are required to prepare a release.'
        );
    }

    runCommand('git', ['fetch', 'origin', 'main', '--tags', '--force'], {
        cwd: ROOT,
    });
    const manifestVersion = sharedManifestVersion(ROOT);
    const completedVersion = latestCompletedStudioVersion(
        await githubReleases(repository, token)
    );
    const version = decideReleaseVersion({
        manifestVersion,
        completedVersion,
        bump,
    });

    verifyCompletedTags(completedVersion, ROOT);
    checkNpmLatestVersions(await npmLatestVersions(fetch), [completedVersion]);
    await verifyTargetIsUnused(version, ROOT, fetch);

    writeReleaseVersion(version, ROOT);

    writeActionsOutput({
        version,
        previous_version: completedVersion,
        branch: releaseBranch(version),
    });
}

function releasePullRequests(branch) {
    const result = runCommand('gh', [
        'pr',
        'list',
        '--head',
        branch,
        '--base',
        RELEASE_BASE_BRANCH,
        '--state',
        'all',
        '--json',
        'number,state,title,url',
    ]);
    return JSON.parse(result.stdout || '[]');
}

function validateReleasePullRequestTitle(pullRequest, version) {
    const expected = releaseTitle(version);
    if (pullRequest.title !== expected) {
        throw new Error(
            `Pull request ${pullRequest.url} is titled "${pullRequest.title}", expected "${expected}".`
        );
    }
}

function reuseReleasePullRequest(branch, version) {
    const pullRequests = releasePullRequests(branch);
    const open = pullRequests.find(({ state }) => state === 'OPEN');
    if (open) {
        validateReleasePullRequestTitle(open, version);
        console.log(`Reusing release pull request ${open.url}`);
        return open.url;
    }

    const closed = pullRequests.find(({ state }) => state === 'CLOSED');
    if (closed) {
        validateReleasePullRequestTitle(closed, version);
        runCommand('gh', ['pr', 'reopen', String(closed.number)]);
        console.log(`Reopened release pull request ${closed.url}`);
        return closed.url;
    }

    const merged = pullRequests.find(({ state }) => state === 'MERGED');
    if (merged) {
        throw new Error(
            `${branch} already belongs to merged pull request ${merged.url}.`
        );
    }

    return null;
}

function releasePullRequestBody(version, previousVersion) {
    return [
        `This pull request raises every Doodle Engine package from ${previousVersion} to ${version}.`,
        '',
        'Merging it publishes the release:',
        '',
        '- the four npm packages',
        '- the Windows and macOS Doodle Studio installers',
        '- the five package tags and the GitHub release',
        '',
        'It was created by the Release Doodle Engine workflow. Only the `version` field',
        'of the five package manifests may change here.',
    ].join('\n');
}

function openReleasePullRequest(options) {
    const version = requiredOption(options, 'version');
    const previousVersion = requiredOption(options, 'previous-version');
    const branch = releaseBranch(version);

    const remoteBranch = gitOutput(['ls-remote', '--heads', 'origin', branch]);
    if (remoteBranch) {
        const remoteSha = remoteBranch.split(/\s+/, 1)[0];
        runCommand('git', [
            'fetch',
            '--no-tags',
            'origin',
            `refs/heads/${branch}`,
        ]);
        const fetchedSha = gitOutput(['rev-parse', 'FETCH_HEAD']);
        if (fetchedSha !== remoteSha) {
            throw new Error(
                `${branch} changed while the release workflow was reading it.`
            );
        }
        validatePreparedReleaseBranch({
            branch,
            version,
            previousVersion,
            headSha: fetchedSha,
        });
        console.log(`Reusing the validated ${branch} branch.`);
    } else {
        if (sharedManifestVersion(ROOT) !== version) {
            throw new Error(
                `The working tree does not contain version ${version}.`
            );
        }
        runCommand('git', ['switch', '--create', branch]);
        runCommand('git', ['add', ...RELEASE_MANIFEST_PATHS]);
        runCommand('git', [
            '-c',
            'user.name=github-actions[bot]',
            '-c',
            'user.email=41898282+github-actions[bot]@users.noreply.github.com',
            'commit',
            '-m',
            releaseTitle(version),
        ]);
        validatePreparedReleaseBranch({
            branch,
            version,
            previousVersion,
            headSha: gitOutput(['rev-parse', 'HEAD']),
        });
        runCommand('git', ['push', 'origin', `${branch}:${branch}`]);
    }

    const existingUrl = reuseReleasePullRequest(branch, version);
    if (existingUrl) {
        writeActionsOutput({ pull_request: existingUrl });
        return;
    }

    const created = runCommand('gh', [
        'pr',
        'create',
        '--base',
        RELEASE_BASE_BRANCH,
        '--head',
        branch,
        '--title',
        releaseTitle(version),
        '--body',
        releasePullRequestBody(version, previousVersion),
    ]);
    writeActionsOutput({
        pull_request: created.stdout.trim(),
    });
}

function manifestAt(sha, path) {
    const result = runCommand('git', ['show', `${sha}:${path}`], {
        allowFailure: true,
    });
    if (result.status !== 0) return null;
    try {
        return JSON.parse(result.stdout);
    } catch {
        return null;
    }
}

function validateReleaseRange({
    merged,
    baseRef,
    branch,
    title,
    baseSha,
    headSha,
}) {
    const changed = gitOutput(['diff', '--name-only', baseSha, headSha]);
    return validateReleasePullRequest({
        merged,
        baseRef,
        branch,
        title,
        changedFiles: changed ? changed.split(/\r?\n/) : [],
        manifests: RELEASE_PACKAGES.map((pkg, index) => ({
            name: pkg.name,
            before: manifestAt(baseSha, RELEASE_MANIFEST_PATHS[index]),
            after: manifestAt(headSha, RELEASE_MANIFEST_PATHS[index]),
        })),
    });
}

function validatePreparedReleaseBranch({
    branch,
    version,
    previousVersion,
    headSha,
}) {
    const baseSha = gitOutput([
        'merge-base',
        `origin/${RELEASE_BASE_BRANCH}`,
        headSha,
    ]);
    const actual = validateReleaseRange({
        merged: true,
        baseRef: RELEASE_BASE_BRANCH,
        branch,
        title: releaseTitle(version),
        baseSha,
        headSha,
    });
    if (
        actual.version !== version ||
        actual.previousVersion !== previousVersion
    ) {
        throw new Error(
            `${branch} changes ${actual.previousVersion} to ${actual.version}, ` +
                `expected ${previousVersion} to ${version}.`
        );
    }
}

function validateMergedReleasePullRequest(options) {
    const branch = requiredOption(options, 'branch');
    const title = requiredOption(options, 'title');
    const mergeSha = requiredOption(options, 'merge-sha');
    const merged = options.merged === 'true';

    runCommand('git', ['fetch', 'origin', 'main', '--force'], { cwd: ROOT });

    const parentSha = gitOutput(['rev-parse', `${mergeSha}^1`]);
    const { version, previousVersion } = validateReleaseRange({
        merged,
        baseRef: requiredOption(options, 'base-ref'),
        branch,
        title,
        baseSha: parentSha,
        headSha: mergeSha,
    });

    const contained = runCommand(
        'git',
        ['merge-base', '--is-ancestor', mergeSha, 'origin/main'],
        { allowFailure: true }
    );
    if (contained.status !== 0) {
        throw new Error(`${mergeSha} is not part of the main branch.`);
    }

    writeActionsOutput({
        version,
        previous_version: previousVersion,
        release_sha: gitOutput(['rev-parse', mergeSha]),
    });
}

function collectManifestPaths(value, paths = new Set()) {
    if (typeof value === 'string' && value.startsWith('./')) {
        paths.add(value.slice(2));
    } else if (Array.isArray(value)) {
        for (const item of value) collectManifestPaths(item, paths);
    } else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) {
            collectManifestPaths(item, paths);
        }
    }
    return paths;
}

export function validatePackedPackage(
    manifest,
    archiveEntries,
    expectedName,
    expectedVersion
) {
    if (manifest.name !== expectedName) {
        throw new Error(
            `Packed ${expectedName} has package name ${manifest.name}.`
        );
    }
    if (manifest.version !== expectedVersion) {
        throw new Error(
            `${expectedName} packed at ${manifest.version}, expected ${expectedVersion}.`
        );
    }
    if (JSON.stringify(manifest).includes('workspace:')) {
        throw new Error(`${expectedName} still contains a workspace: range.`);
    }

    for (const section of [
        'dependencies',
        'optionalDependencies',
        'peerDependencies',
    ]) {
        for (const [name, range] of Object.entries(manifest[section] ?? {})) {
            if (
                RELEASE_PACKAGES.some((pkg) => pkg.name === name) &&
                range !== expectedVersion
            ) {
                throw new Error(
                    `${expectedName} depends on ${name}@${range}, expected ${expectedVersion}.`
                );
            }
        }
    }

    const expectedFiles = collectManifestPaths({
        main: manifest.main,
        module: manifest.module,
        types: manifest.types,
        exports: manifest.exports,
        bin: manifest.bin,
    });
    const entrySet = new Set(archiveEntries);
    for (const path of expectedFiles) {
        if (!entrySet.has(`package/${path}`)) {
            throw new Error(`${expectedName} is missing ${path}.`);
        }
    }
}

function archiveManifest(archive) {
    return JSON.parse(
        runCommand('tar', ['-xOf', archive, 'package/package.json']).stdout
    );
}

function archiveEntries(archive) {
    return runCommand('tar', ['-tf', archive])
        .stdout.split(/\r?\n/)
        .filter(Boolean)
        .map((entry) => entry.replace(/\/$/, ''));
}

function archiveName(packageName, version) {
    return `${packageName.slice(1).replace('/', '-')}-${version}.tgz`;
}

function packPackages(options) {
    const outputDirectory = resolve(
        ROOT,
        requiredOption(options, 'output-dir')
    );
    const version = sharedManifestVersion(ROOT);
    mkdirSync(outputDirectory, { recursive: true });

    for (const pkg of RELEASE_PACKAGES.filter((item) => item.public)) {
        const archive = join(outputDirectory, archiveName(pkg.name, version));
        runCommand('yarn', ['pack', '--out', archive], {
            cwd: join(ROOT, pkg.directory),
        });
        validatePackedPackage(
            archiveManifest(archive),
            archiveEntries(archive),
            pkg.name,
            version
        );
        console.log(`Checked ${basename(archive)}`);
    }
}

function filesRecursively(directory) {
    if (!existsSync(directory)) return [];
    return readdirSync(directory).flatMap((name) => {
        const path = join(directory, name);
        return statSync(path).isDirectory() ? filesRecursively(path) : [path];
    });
}

function verifyStudio(options) {
    const version = requiredOption(options, 'version');
    const platform = requiredOption(options, 'platform');
    const directory = resolve(ROOT, requiredOption(options, 'directory'));
    const actual = sharedManifestVersion(ROOT);
    if (actual !== version) {
        throw new Error(
            `Studio build is at ${actual}, expected release ${version}.`
        );
    }

    const files = filesRecursively(directory).map((path) => basename(path));
    const expected =
        platform === 'windows'
            ? `doodle-studio-${version}-setup.exe`
            : platform === 'mac'
              ? `doodle-studio-${version}-universal.dmg`
              : null;
    if (!expected) throw new Error(`Unknown Studio platform "${platform}".`);
    if (!files.includes(expected)) {
        throw new Error(
            `Studio ${platform} build did not create ${expected}.\nFound: ${files.join(', ')}`
        );
    }
    console.log(`Checked ${expected}`);
}

function sha512Integrity(path) {
    return `sha512-${createHash('sha512')
        .update(readFileSync(path))
        .digest('base64')}`;
}

function releaseTarballs(directory, version) {
    const tarballs = filesRecursively(directory).filter((path) =>
        path.endsWith('.tgz')
    );
    const byName = new Map();
    for (const path of tarballs) {
        const manifest = archiveManifest(path);
        validatePackedPackage(
            manifest,
            archiveEntries(path),
            manifest.name,
            version
        );
        byName.set(manifest.name, path);
    }
    for (const { name } of RELEASE_PACKAGES.filter((pkg) => pkg.public)) {
        if (!byName.has(name)) {
            throw new Error(`Missing npm tarball for ${name}@${version}.`);
        }
    }
    return byName;
}

function checkTargetTags(version, releaseSha) {
    runCommand('git', ['fetch', 'origin', '--tags', '--force']);
    verifyTagsMatchCommit(version, releaseSha, ROOT);
}

async function publishNpmPackages(tarballs, version) {
    for (const { name } of RELEASE_PACKAGES.filter((pkg) => pkg.public)) {
        const tarball = tarballs.get(name);
        const metadata = await npmPackageMetadata(name, version, fetch, {
            allowMissing: true,
        });
        if (metadata) {
            const expected = sha512Integrity(tarball);
            if (metadata.dist?.integrity !== expected) {
                throw new Error(
                    `${name}@${version} already exists with different contents.`
                );
            }
            console.log(`${name}@${version} is already published.`);
            continue;
        }
        runCommand('npm', ['publish', tarball, '--access', 'public']);
    }
}

function createReleaseTags(version, releaseSha) {
    const refs = [];
    for (const { name } of RELEASE_PACKAGES) {
        const tag = `${name}@${version}`;
        if (!tagCommit(tag, ROOT)) {
            runCommand('git', ['tag', tag, releaseSha]);
        }
        refs.push(`refs/tags/${tag}`);
    }
    runCommand('git', ['push', '--atomic', 'origin', ...refs]);
}

function releaseSummary(version) {
    return [
        `All Doodle Engine packages in this release use version ${version}:`,
        '',
        '- `@doodle-engine/core`',
        '- `@doodle-engine/react`',
        '- `@doodle-engine/toolkit`',
        '- `@doodle-engine/cli`',
        '- Doodle Studio',
    ].join('\n');
}

function publishGitHubRelease(version, previousVersion, studioDirectory) {
    const tag = `${STUDIO_TAG_PREFIX}${version}`;
    const view = runCommand(
        'gh',
        ['release', 'view', tag, '--json', 'isDraft,assets'],
        { allowFailure: true }
    );
    let release = view.status === 0 ? JSON.parse(view.stdout) : null;

    if (!release) {
        runCommand('gh', [
            'release',
            'create',
            tag,
            '--draft',
            '--verify-tag',
            '--title',
            `Doodle Engine ${version}`,
            '--notes',
            releaseSummary(version),
            '--generate-notes',
            '--notes-start-tag',
            `${STUDIO_TAG_PREFIX}${previousVersion}`,
        ]);
        release = { isDraft: true, assets: [] };
    }

    const assets = filesRecursively(studioDirectory).filter((path) =>
        /\.(exe|dmg)$/i.test(path)
    );
    const names = new Set(assets.map((path) => basename(path)));
    if (![...names].some((name) => name.endsWith('.exe'))) {
        throw new Error('The Windows Studio installer is missing.');
    }
    if (![...names].some((name) => name.endsWith('.dmg'))) {
        throw new Error('The macOS Studio installer is missing.');
    }

    if (!release.isDraft) {
        const publishedNames = new Set(
            (release.assets ?? []).map((asset) => asset.name)
        );
        for (const name of names) {
            if (!publishedNames.has(name)) {
                throw new Error(
                    `Published GitHub release ${tag} is missing ${name}.`
                );
            }
        }
        console.log(`GitHub release ${tag} is already complete.`);
        return;
    }

    runCommand('gh', ['release', 'upload', tag, ...assets, '--clobber']);
    runCommand('gh', ['release', 'edit', tag, '--draft=false']);
}

async function publishRelease(options) {
    const version = requiredOption(options, 'version');
    const previousVersion = requiredOption(options, 'previous-version');
    const releaseSha = requiredOption(options, 'release-sha');
    const npmDirectory = resolve(
        ROOT,
        requiredOption(options, 'npm-directory')
    );
    const studioDirectory = resolve(
        ROOT,
        requiredOption(options, 'studio-directory')
    );

    if (sharedManifestVersion(ROOT) !== version) {
        throw new Error(
            `The release checkout does not contain version ${version}.`
        );
    }
    const head = gitOutput(['rev-parse', 'HEAD']);
    if (head !== releaseSha) {
        throw new Error(
            `The release checkout is ${head}, expected ${releaseSha}.`
        );
    }

    const tarballs = releaseTarballs(npmDirectory, version);
    checkTargetTags(version, releaseSha);
    await publishNpmPackages(tarballs, version);
    createReleaseTags(version, releaseSha);
    publishGitHubRelease(version, previousVersion, studioDirectory);
}

function parseOptions(args) {
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
        const key = args[index];
        const value = args[index + 1];
        if (!key?.startsWith('--') || value === undefined) {
            throw new Error(`Invalid arguments: ${args.join(' ')}`);
        }
        options[key.slice(2)] = value;
    }
    return options;
}

function requiredOption(options, name) {
    const value = options[name];
    if (!value) throw new Error(`Missing --${name}.`);
    return value;
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    const options = parseOptions(args);
    if (command === 'prepare') return prepareRelease(options);
    if (command === 'open-pull-request') return openReleasePullRequest(options);
    if (command === 'validate-pull-request') {
        return validateMergedReleasePullRequest(options);
    }
    if (command === 'pack') return packPackages(options);
    if (command === 'verify-studio') return verifyStudio(options);
    if (command === 'publish') return publishRelease(options);
    throw new Error(
        'Usage: release.mjs <prepare|open-pull-request|validate-pull-request|' +
            'pack|verify-studio|publish> [options]'
    );
}

if (
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
