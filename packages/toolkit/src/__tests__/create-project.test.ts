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
    it('gives each generated game its own stable project identity', async () => {
        const targetDir = await makeTempDir();
        const first = await createProject('first-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
        });
        const second = await createProject('second-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
        });

        const firstProject = await readFile(
            join(first.projectPath, 'src', 'project.ts'),
            'utf-8'
        );
        const secondProject = await readFile(
            join(second.projectPath, 'src', 'project.ts'),
            'utf-8'
        );
        const firstId = firstProject.match(/PROJECT_ID = "([^"]+)";/)?.[1];
        const secondId = secondProject.match(/PROJECT_ID = "([^"]+)";/)?.[1];
        const firstApp = await readFile(
            join(first.projectPath, 'src', 'App.tsx'),
            'utf-8'
        );

        expect(firstId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );
        expect(secondId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );
        expect(firstId).not.toBe(secondId);
        expect(firstApp).toContain("import { PROJECT_ID } from './project'");
        expect(firstApp).toContain('projectId={PROJECT_ID}');
    });

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

    it('creates a valid minimal project with literal English text', async () => {
        const targetDir = await makeTempDir();
        const { projectPath } = await createProject('minimal-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
            contentMode: 'minimal',
            localizationMode: 'literal',
        });

        expect(
            await readdir(join(projectPath, 'content', 'locations'))
        ).toEqual(['start.yaml']);
        expect(
            await readdir(join(projectPath, 'content', 'characters'))
        ).toEqual([]);
        expect(
            await readdir(join(projectPath, 'content', 'dialogues'))
        ).toEqual([]);
        expect(await readdir(join(projectPath, 'content', 'quests'))).toEqual(
            []
        );

        const start = await readFile(
            join(projectPath, 'content', 'locations', 'start.yaml'),
            'utf-8'
        );
        expect(start).toContain('name: "Starting Place"');

        const loaded = await loadProject(projectPath);
        expect(loaded.config.startLocation).toBe('start');
        expect(Object.keys(loaded.registry.locations)).toEqual(['start']);
        expect(loaded.parseErrors).toEqual([]);
        expect(
            validateContent(loaded.registry, loaded.fileMap, loaded.config)
        ).toEqual([]);
    });

    it('keeps the localization example available in a minimal project', async () => {
        const targetDir = await makeTempDir();
        const { projectPath } = await createProject('minimal-localized-game', {
            targetDir,
            useDefaultRenderer: true,
            useStarterStyles: true,
            contentMode: 'minimal',
            localizationMode: 'localized',
        });

        const loaded = await loadProject(projectPath);
        expect(loaded.registry.locations.start.name).toBe(
            '@location.start.name'
        );
        expect(loaded.registry.locales.en['location.start.name']).toBe(
            'Starting Place'
        );
        expect(loaded.registry.locales.sv['location.start.name']).toBe(
            'Startplats'
        );
        expect(loaded.registry.locales.sv['ui.language']).toBe('Språk');
        expect(loaded.parseErrors).toEqual([]);
        expect(
            validateContent(loaded.registry, loaded.fileMap, loaded.config)
        ).toEqual([]);
    });
});
