import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveText } from '@doodle-engine/core';
import { createProject } from '../create-project';
import { loadProject } from '../load-project';
import { validateContent } from '../validate';
import { getAvailableLocales } from '../templates/src/locale-options';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'doodle-create-'));
    tempDirs.push(root);
    return root;
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('createProject language setup', () => {
    it('creates literal English content and a commented blank locale file by default', async () => {
        const targetDir = await makeTempDir();
        const { projectPath } = await createProject('literal-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
        });

        const localeSource = await readFile(
            join(projectPath, 'content', 'locales', 'en.yaml'),
            'utf-8'
        );
        expect(parseYaml(localeSource)).toBeNull();
        expect(localeSource).toContain('To localize a string later:');
        await expect(
            readFile(
                join(projectPath, 'content', 'locales', 'sv.yaml'),
                'utf-8'
            )
        ).rejects.toThrow();

        const bartenderSource = await readFile(
            join(projectPath, 'content', 'dialogues', 'bartender_greeting.dlg'),
            'utf-8'
        );
        expect(bartenderSource).toContain(
            'BARTENDER: Welcome to the Salty Dog, stranger. What can I get you?'
        );
        expect(bartenderSource).toContain(
            "CHOICE What's the news around here?"
        );
        expect(bartenderSource).not.toContain('BARTENDER: "');
        expect(bartenderSource).not.toContain('CHOICE "');

        const contentDir = join(projectPath, 'content');
        const contentFiles = await readdir(contentDir, { recursive: true });
        for (const relativePath of contentFiles) {
            if (!/\.(?:yaml|yml|dlg)$/.test(relativePath)) continue;
            const source = await readFile(
                join(contentDir, relativePath),
                'utf-8'
            );
            const activeSource = source
                .split(/\r?\n/)
                .filter((line) => !line.trimStart().startsWith('#'))
                .join('\n');
            expect(activeSource, relativePath).not.toMatch(/@[A-Za-z0-9_.-]+/);
        }

        const loaded = await loadProject(projectPath);
        expect(loaded.parseErrors).toEqual([]);
        expect(
            validateContent(loaded.registry, loaded.fileMap, loaded.config)
        ).toEqual([]);
    });

    it('creates keyed content with complete English and Swedish story translations', async () => {
        const targetDir = await makeTempDir();
        const { projectPath } = await createProject('localized-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
            localizationMode: 'localized',
        });

        const loaded = await loadProject(projectPath);
        expect(loaded.parseErrors).toEqual([]);
        expect(
            validateContent(loaded.registry, loaded.fileMap, loaded.config)
        ).toEqual([]);

        const englishKeys = Object.keys(loaded.registry.locales.en);
        const swedishKeys = Object.keys(loaded.registry.locales.sv);
        expect(englishKeys.length).toBeGreaterThan(0);
        expect(swedishKeys.sort()).toEqual(englishKeys.sort());
        expect(loaded.registry.locales.sv['ui.language']).toBe('Språk');

        const swedishInterlude = resolveText(
            loaded.registry.interludes.chapter_one.text,
            loaded.registry.locales.sv
        );
        expect(swedishInterlude).toContain('Kapitel ett: En ny början');
        expect(swedishInterlude).not.toContain('Chapter One');

        const app = await readFile(
            join(projectPath, 'src', 'App.tsx'),
            'utf-8'
        );
        expect(app).toContain('getAvailableLocales(content.registry.locales)');

        await writeFile(
            join(projectPath, 'content', 'locales', 'fr.yaml'),
            'ui.language: "Langue"\n'
        );
        const withFrench = await loadProject(projectPath);
        expect(
            getAvailableLocales(withFrench.registry.locales).map(
                (locale) => locale.code
            )
        ).toEqual(['en', 'fr', 'sv']);
    });
});
