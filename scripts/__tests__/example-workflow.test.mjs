import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const rootPackage = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf-8')
);
const examplePackage = JSON.parse(
    await readFile(
        new URL('../../examples/theme-preview/package.json', import.meta.url),
        'utf-8'
    )
);

test('the theme preview uses local engine packages through the CLI', () => {
    assert.equal(
        examplePackage.dependencies['@doodle-engine/core'],
        'workspace:*'
    );
    assert.equal(
        examplePackage.dependencies['@doodle-engine/react'],
        'workspace:*'
    );
    assert.equal(
        examplePackage.devDependencies['@doodle-engine/cli'],
        'workspace:*'
    );
    assert.equal(
        examplePackage.devDependencies['@doodle-engine/toolkit'],
        undefined
    );
    assert.equal(examplePackage.scripts.dev, 'doodle-engine dev');
    assert.equal(examplePackage.scripts.build, 'doodle-engine build');
    assert.equal(examplePackage.scripts.validate, 'doodle-engine validate');
});

test('the theme preview keeps every built-in theme font installed', () => {
    assert.deepEqual(
        Object.keys(examplePackage.dependencies)
            .filter((name) => name.startsWith('@fontsource'))
            .sort(),
        [
            '@fontsource-variable/cormorant-garamond',
            '@fontsource-variable/eb-garamond',
            '@fontsource-variable/public-sans',
            '@fontsource-variable/source-serif-4',
            '@fontsource/spectral',
        ]
    );
    assert.equal(examplePackage.scripts.theme, 'doodle-engine theme');
    assert.deepEqual(examplePackage.doodleEngine.managedFontDependencies, []);
    assert.equal(examplePackage.doodleEngine.manageFontDependencies, false);
});

test('root example commands prepare local packages before use', () => {
    assert.match(rootPackage.scripts.example, /--from theme-preview/);
    assert.match(rootPackage.scripts['example:theme'], /--from theme-preview/);
});

test('the preview has no copied command wrappers', async () => {
    for (const name of ['dev.mjs', 'build.mjs', 'validate.mjs', 'theme.mjs']) {
        await assert.rejects(
            access(
                new URL(`../../examples/theme-preview/${name}`, import.meta.url)
            )
        );
    }
});
