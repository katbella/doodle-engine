import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('keeps every release workspace version in lockstep', async () => {
    const packages = ['core', 'react', 'toolkit', 'cli', 'studio'];
    const manifests = await Promise.all(
        packages.map(async (name) =>
            JSON.parse(
                await readFile(
                    join(root, 'packages', name, 'package.json'),
                    'utf8'
                )
            )
        )
    );

    assert.deepEqual(
        [...new Set(manifests.map((manifest) => manifest.version))],
        [manifests[0].version]
    );
});

test('tags Studio when its manifest is new on main', async () => {
    const workflow = await readFile(
        join(root, '.github', 'workflows', 'release.yml'),
        'utf8'
    );

    assert.match(
        workflow,
        /if ! git cat-file[\s\S]+current=.*studio\/package\.json[\s\S]+echo "version=\$current"/
    );
});
