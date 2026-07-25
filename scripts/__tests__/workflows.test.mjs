import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function repositoryFile(path) {
    return readFile(join(root, path), 'utf8');
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

test('release is manual-only and creates one direct version commit', async () => {
    const workflow = await repositoryFile('.github/workflows/release.yml');
    assert.match(workflow, /workflow_dispatch:/);
    assert.doesNotMatch(workflow, /^\s+push:/m);
    assert.equal(
        occurrences(workflow, /node scripts\/release\.mjs commit/g),
        1
    );
    assert.match(workflow, /if: steps\.prepare\.outputs\.needs_commit/);
    assert.doesNotMatch(workflow, /pull-requests:\s*write/);
    assert.doesNotMatch(workflow, /changesets\/action/);
});

test('the version commit is pushed straight to main by the release script', async () => {
    const script = await repositoryFile('scripts/release.mjs');
    assert.match(script, /'push', 'origin', 'HEAD:main'/);
    assert.doesNotMatch(script, /pull-request|gh pr /i);
});

test('release builds packages and installers without rerunning tests', async () => {
    const workflow = await repositoryFile('.github/workflows/release.yml');
    assert.match(workflow, /Build public packages/);
    assert.match(workflow, /platform: windows/);
    assert.match(workflow, /platform: mac/);
    assert.match(workflow, /Publish Doodle/);
    assert.doesNotMatch(
        workflow,
        /yarn (?:test|test:coverage|typecheck)|test:e2e|Test Studio|Typecheck Studio/
    );
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

test('workflows enable Corepack before running Yarn', async () => {
    for (const path of [
        '.github/workflows/ci.yml',
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

test('Changesets and the old packaging workflow are removed', async () => {
    const packageJson = JSON.parse(await repositoryFile('package.json'));
    assert.equal(packageJson.devDependencies['@changesets/cli'], undefined);
    assert.equal(packageJson.scripts.changeset, undefined);
    assert.equal(packageJson.scripts.version, undefined);
    assert.equal(packageJson.scripts.release, undefined);
    assert.equal(
        existsSync(join(root, '.github', 'workflows', 'package-studio.yml')),
        false
    );
    assert.equal(existsSync(join(root, '.changeset', 'config.json')), false);
});
