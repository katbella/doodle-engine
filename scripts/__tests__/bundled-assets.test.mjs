import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const extensionDirectory = join(root, 'extensions', 'vscode-dlg');
const sourceArtifact = join(extensionDirectory, 'doodle-dlg-syntax.vsix');
const cliArtifact = join(
    root,
    'packages',
    'cli',
    'extensions',
    'doodle-dlg-syntax.vsix'
);

function valuesFromAlternation(pattern) {
    const match = pattern.match(/\(([^()]+)\)/);
    assert.ok(match, `Expected an alternation in ${pattern}`);
    return match[1].split('|').sort();
}

test('committed bundled assets match their sources', async () => {
    assert.deepEqual(
        await readFile(sourceArtifact),
        await readFile(cliArtifact)
    );
    assert.deepEqual(
        await readFile(join(root, 'packages', 'studio', 'build', 'icon.png')),
        await readFile(
            join(root, 'packages', 'studio', 'resources', 'icon.png')
        )
    );
});

test('the VSIX contains only the extension runtime files', async (t) => {
    const extracted = await mkdtemp(join(tmpdir(), 'doodle-vsix-test-'));
    const entries = [];
    t.after(() => rm(extracted, { recursive: true, force: true }));
    await extract(sourceArtifact, {
        dir: extracted,
        onEntry: (entry) => {
            if (!entry.fileName.endsWith('/')) entries.push(entry.fileName);
        },
    });

    assert.deepEqual(entries.sort(), [
        '[Content_Types].xml',
        'extension.vsixmanifest',
        'extension/LICENSE.txt',
        'extension/language-configuration.json',
        'extension/package.json',
        'extension/readme.md',
        'extension/syntaxes/dlg.tmLanguage.json',
    ]);

    const sourceManifest = JSON.parse(
        await readFile(join(extensionDirectory, 'package.json'), 'utf8')
    );
    const packagedManifest = JSON.parse(
        await readFile(join(extracted, 'extension', 'package.json'), 'utf8')
    );
    assert.deepEqual(packagedManifest, sourceManifest);

    const sourceReadme = await readFile(
        join(extensionDirectory, 'README.md'),
        'utf8'
    );
    assert.equal(
        (
            await readFile(join(extracted, 'extension', 'readme.md'), 'utf8')
        ).replaceAll('\r\n', '\n'),
        sourceReadme.replaceAll('\r\n', '\n')
    );
    assert.equal(
        (
            await readFile(join(extracted, 'extension', 'LICENSE.txt'), 'utf8')
        ).replaceAll('\r\n', '\n'),
        (await readFile(join(root, 'LICENSE'), 'utf8')).replaceAll('\r\n', '\n')
    );
});

test('the grammar vocabulary matches the core descriptors', async () => {
    const grammar = JSON.parse(
        await readFile(
            join(extensionDirectory, 'syntaxes', 'dlg.tmLanguage.json'),
            'utf8'
        )
    );
    const descriptors = await readFile(
        join(root, 'packages', 'core', 'src', 'parser', 'descriptors.ts'),
        'utf8'
    );
    const [conditionSource, effectSource] = descriptors.split(
        'export const EFFECT_DESCRIPTORS'
    );
    const keywords = (source) =>
        [...source.matchAll(/keyword: '([^']+)'/g)].map((match) => match[1]);
    const conditionKeywords = keywords(conditionSource).sort();
    const effectKeywords = keywords(effectSource);

    assert.deepEqual(
        valuesFromAlternation(
            grammar.repository.conditionTypes.patterns[0].match
        ),
        conditionKeywords
    );

    const effectObjects = [
        ...new Set(
            effectKeywords
                .map((keyword) => keyword.split(' ')[1])
                .filter(Boolean)
        ),
    ].sort();
    assert.deepEqual(
        valuesFromAlternation(
            grammar.repository.effectObjects.patterns[0].match
        ),
        effectObjects
    );

    const grammarWords = new Set(
        Object.values(grammar.repository)
            .flatMap((entry) => entry.patterns ?? [])
            .flatMap(
                (pattern) => pattern.match?.match(/[A-Za-z][A-Za-z0-9]*/g) ?? []
            )
    );
    for (const keyword of effectKeywords) {
        for (const token of keyword.split(' ')) {
            assert.ok(
                grammarWords.has(token),
                `${token} is missing from the grammar`
            );
        }
    }
});
