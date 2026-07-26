import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsSource = join(root, 'docs', 'src');
const screenshotDir = join(root, 'docs', 'public', 'images', 'studio');

async function filesBelow(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map((entry) => {
                const path = join(directory, entry.name);
                return entry.isDirectory() ? filesBelow(path) : [path];
            })
        )
    ).flat();
}

test('Studio documentation screenshots match documentation references', async () => {
    const sourceFiles = await filesBelow(docsSource);
    const source = (
        await Promise.all(sourceFiles.map((path) => readFile(path, 'utf8')))
    ).join('\n');
    const referenced = new Set(
        [...source.matchAll(/\/images\/studio\/([^"'()\s]+\.webp)/g)].map(
            (match) => match[1]
        )
    );
    const screenshots = new Set(
        (await readdir(screenshotDir)).filter((name) => name.endsWith('.webp'))
    );
    const reachable = new Set(referenced);
    for (const name of referenced) {
        const lightName = name.replace(/\.webp$/, '-light.webp');
        if (screenshots.has(lightName)) reachable.add(lightName);
    }

    assert.deepEqual(
        [...referenced].filter((name) => !screenshots.has(name)).sort(),
        [],
        'documentation references missing Studio screenshots'
    );
    assert.deepEqual(
        [...screenshots].filter((name) => !reachable.has(name)).sort(),
        [],
        `unused Studio screenshots under ${relative(root, screenshotDir)}`
    );
});
