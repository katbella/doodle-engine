import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function repositoryFile(path) {
    const contents = await readFile(join(root, path), 'utf8');
    return contents.replaceAll('\r\n', '\n');
}

function occurrences(value, pattern) {
    return [...value.matchAll(pattern)].length;
}

test('keeps all five checked-in package versions in lockstep', async () => {
    const manifests = await Promise.all(
        ['core', 'react', 'toolkit', 'cli', 'studio'].map(async (name) =>
            JSON.parse(await repositoryFile(`packages/${name}/package.json`))
        )
    );
    assert.equal(new Set(manifests.map(({ version }) => version)).size, 1);
});

test('release is manual-only and opens one release pull request', async () => {
    const workflow = await repositoryFile('.github/workflows/release.yml');
    assert.match(workflow, /^name: Release Doodle Engine$/m);
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s+push:/m);
    assert.match(workflow, /pull-requests:\s*write/);
    assert.match(workflow, /if: github\.ref != 'refs\/heads\/main'/);
    assert.match(
        workflow,
        /summary:\n\s+description: One-sentence release summary\n\s+required: true/
    );
    assert.match(workflow, /RELEASE_SUMMARY: \$\{\{ inputs\.summary \}\}/);
    assert.match(workflow, /--summary "\$RELEASE_SUMMARY"/);
    assert.equal(
        occurrences(workflow, /node scripts\/release\.mjs prepare/g),
        1
    );
    assert.equal(
        occurrences(workflow, /node scripts\/release\.mjs open-pull-request/g),
        1
    );
});

test('publishing carries the release summary from the merged pull request', async () => {
    const workflow = await repositoryFile('.github/workflows/publish.yml');

    assert.match(
        workflow,
        /PR_BODY: \$\{\{ github\.event\.pull_request\.body \}\}/
    );
    assert.match(workflow, /--body "\$PR_BODY"/);
    assert.match(
        workflow,
        /summary: \$\{\{ steps\.validate\.outputs\.summary \}\}/
    );
    assert.match(
        workflow,
        /RELEASE_SUMMARY: \$\{\{ needs\.validate\.outputs\.summary \}\}/
    );
    assert.match(workflow, /--summary "\$RELEASE_SUMMARY"/);
});

test('public release names use the Doodle Engine family name', async () => {
    const publishWorkflow = await repositoryFile(
        '.github/workflows/publish.yml'
    );
    const script = await repositoryFile('scripts/release.mjs');

    assert.match(publishWorkflow, /^name: Publish Doodle Engine$/m);
    assert.match(script, /RELEASE_SUBJECT_PREFIX = 'Release Doodle Engine '/);
    assert.match(script, /`Doodle Engine \$\{version\}`/);
    assert.match(script, /All Doodle Engine packages in this release/);
});

test('the release workflow never publishes or pushes to main', async () => {
    const workflow = await repositoryFile('.github/workflows/release.yml');
    assert.doesNotMatch(
        workflow,
        /release\.mjs (?:publish|pack|verify-studio)/
    );
    assert.doesNotMatch(workflow, /windows-latest|macos-latest/);
    const script = await repositoryFile('scripts/release.mjs');
    assert.doesNotMatch(script, /HEAD:main|push', 'origin', 'main/);
    assert.doesNotMatch(script, /RELEASE_TOKEN/);
    assert.match(script, /'pr',\s*'create'/);
});

test('no workflow uses a personal release token', async () => {
    for (const name of [
        'ci.yml',
        'release.yml',
        'publish.yml',
        'deploy-docs.yml',
        'studio-platform-check.yml',
    ]) {
        const workflow = await repositoryFile(`.github/workflows/${name}`);
        assert.doesNotMatch(workflow, /RELEASE_TOKEN|secrets\.GH_PAT/);
    }
});

test('only a merged release pull request starts publishing', async () => {
    const workflow = await repositoryFile('.github/workflows/publish.yml');
    assert.match(workflow, /pull_request:\n\s+types: \[closed\]/);
    assert.match(workflow, /branches: \[main\]/);
    assert.match(workflow, /paths:\n\s+- packages\/\*\/package\.json/);
    assert.doesNotMatch(workflow, /^\s+push:/m);
    assert.doesNotMatch(workflow, /workflow_dispatch:/);
    assert.match(workflow, /github\.event\.pull_request\.merged == true/);
    assert.match(
        workflow,
        /startsWith\(github\.event\.pull_request\.head\.ref, 'release\/doodle-'\)/
    );
    assert.match(workflow, /release\.mjs validate-pull-request/);
    for (const job of ['package-npm', 'package-studio', 'publish']) {
        assert.match(
            workflow.slice(workflow.indexOf(`\n  ${job}:`)),
            /needs: (?:validate|\[validate)/
        );
    }
});

test('only the final publishing job can write repository contents', async () => {
    const workflow = await repositoryFile('.github/workflows/publish.yml');
    assert.match(workflow, /^permissions:\n\s+contents: read$/m);
    assert.equal(occurrences(workflow, /contents: write/g), 1);

    const publishJob = workflow.slice(workflow.indexOf('\n  publish:'));
    assert.match(publishJob, /\n    permissions:\n\s+contents: write/);
});

test('an existing release branch is validated before its pull request is reused', async () => {
    const script = await repositoryFile('scripts/release.mjs');
    assert.match(script, /'--state',\n\s+'all'/);
    assert.match(script, /'number,state,title,url'/);
    assert.match(script, /validatePreparedReleaseBranch\(\{/);
    assert.match(script, /expected "\$\{expected\}"/);
    assert.match(script, /'pr', 'reopen'/);
    assert.match(script, /already belongs to merged pull request/);
});

test('publishing builds every release file from the merged commit', async () => {
    const workflow = await repositoryFile('.github/workflows/publish.yml');
    assert.match(workflow, /Build public packages/);
    assert.match(workflow, /platform: windows/);
    assert.match(workflow, /platform: mac/);
    assert.match(workflow, /release\.mjs publish/);
    assert.equal(
        occurrences(
            workflow,
            /ref: \$\{\{ needs\.validate\.outputs\.release_sha \}\}/g
        ),
        3
    );
    assert.equal(
        occurrences(
            workflow,
            /ref: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/g
        ),
        1
    );
});

test('publishing does not repeat the release pull request checks', async () => {
    const workflow = await repositoryFile('.github/workflows/publish.yml');
    assert.doesNotMatch(
        workflow,
        /yarn (?:test|test:coverage|typecheck)|test:e2e|Test Studio|Typecheck Studio/
    );
    assert.doesNotMatch(workflow, /yarn --cwd docs|Build documentation/);
    assert.doesNotMatch(workflow, /blockmap|latest\*\.yml/);
});

test('PR CI runs coverage and E2E once without platform jobs', async () => {
    const workflow = await repositoryFile('.github/workflows/ci.yml');
    assert.equal(occurrences(workflow, /run: yarn test:coverage/g), 1);
    assert.equal(occurrences(workflow, /test:e2e:run/g), 1);
    assert.doesNotMatch(workflow, /windows-latest|macos-latest/);
    assert.doesNotMatch(workflow, /^\s+push:/m);
    assert.match(workflow, /\n  verify:/);
});

test('CI knows which pull requests are release pull requests', async () => {
    const workflow = await repositoryFile('.github/workflows/ci.yml');
    assert.match(
        workflow,
        /HEAD_REF: \$\{\{ github\.event\.pull_request\.head\.ref \}\}/
    );
    assert.match(workflow, /run: node scripts\/select-checks\.mjs/);
});

test('workflows enable Corepack before running Yarn', async () => {
    for (const path of [
        '.github/workflows/ci.yml',
        '.github/workflows/publish.yml',
        '.github/workflows/release.yml',
        '.github/workflows/studio-platform-check.yml',
    ]) {
        const workflow = await repositoryFile(path);
        assert.doesNotMatch(workflow, /cache:\s*yarn/);
        for (const command of workflow.matchAll(/run: yarn /g)) {
            assert.ok(
                workflow.indexOf('run: corepack enable') < command.index,
                `${path} runs Yarn before enabling Corepack`
            );
        }
    }
});

test('verify waits for every other CI job', async () => {
    const workflow = await repositoryFile('.github/workflows/ci.yml');
    const jobs = [
        ...workflow
            .slice(workflow.indexOf('\njobs:\n'))
            .matchAll(/^ {2}([a-z0-9-]+):$/gm),
    ].map(([, name]) => name);
    const needs = workflow
        .match(/needs: \[(.+)\]/)[1]
        .split(',')
        .map((name) => name.trim());
    assert.deepEqual(
        needs,
        jobs.filter((name) => name !== 'verify')
    );
});

test('platform tests are manual-only', async () => {
    const workflow = await repositoryFile(
        '.github/workflows/studio-platform-check.yml'
    );
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /schedule:|pull_request:|^\s+push:/m);
    assert.match(workflow, /windows-latest/);
    assert.match(workflow, /macos-latest/);
});

test('documentation deploys only for documentation changes', async () => {
    const workflow = await repositoryFile('.github/workflows/deploy-docs.yml');
    assert.match(workflow, /paths:\s*\n\s+- docs\/\*\*/);
});

test('publish.yml is the only workflow that packages or publishes releases', async () => {
    const workflowDir = join(root, '.github', 'workflows');
    const releaseActions =
        /npm publish|release\.mjs (?:pack|publish)|script:\s*package:(?:win|mac)|electron-builder|gh release|git tag/;
    for (const name of await readdir(workflowDir)) {
        if (!/\.ya?ml$/.test(name) || name === 'publish.yml') continue;
        const workflow = await repositoryFile(`.github/workflows/${name}`);
        assert.doesNotMatch(
            workflow,
            releaseActions,
            `${name} duplicates release packaging or publication`
        );
    }
});
