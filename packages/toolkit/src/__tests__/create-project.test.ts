import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { parseRichText, resolveText } from '@doodle-engine/core';
import { createProject } from '../create-project';
import { loadProject } from '../load-project';
import { validateContent } from '../validate';
import { getAvailableLocales } from '../templates/src/locale-options';
import { DOODLE_VERSION } from '../version';

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
    it.each([
        ['minimal', '/* Minimal', false, []],
        [
            'starter-rpg',
            '/* Starter RPG',
            true,
            ['@fontsource-variable/public-sans'],
        ],
        ['prose', '/* Prose', true, ['@fontsource/spectral']],
        [
            'fable',
            '/* Fable',
            true,
            [
                '@fontsource-variable/cormorant-garamond',
                '@fontsource-variable/eb-garamond',
                '@fontsource-variable/source-serif-4',
            ],
        ],
    ] as const)(
        'creates the %s renderer template and its scaling configuration',
        async (rendererTemplate, marker, scalingEnabled, fontDependencies) => {
            const targetDir = await makeTempDir();
            const { projectPath } = await createProject(
                `${rendererTemplate}-game`,
                {
                    targetDir,
                    useDefaultRenderer: true,
                    rendererTemplate,
                }
            );

            const css = await readFile(
                join(projectPath, 'src', 'renderer-theme.css'),
                'utf-8'
            );
            const indexCss = await readFile(
                join(projectPath, 'src', 'index.css'),
                'utf-8'
            );
            const overridesCss = await readFile(
                join(projectPath, 'src', 'renderer-overrides.css'),
                'utf-8'
            );
            const projectSource = await readFile(
                join(projectPath, 'src', 'project.ts'),
                'utf-8'
            );
            const scaleSource = await readFile(
                join(projectPath, 'src', 'renderer-scale.ts'),
                'utf-8'
            );
            const packageJson = JSON.parse(
                await readFile(join(projectPath, 'package.json'), 'utf-8')
            );

            expect(css).toContain(marker);
            expect(indexCss).toContain("@import './renderer-theme.css'");
            expect(indexCss).toContain("@import './renderer-overrides.css'");
            expect(overridesCss).toContain(
                'Theme switching never replaces this file.'
            );
            expect(projectSource).toContain(
                `enabled: ${String(scalingEnabled)}`
            );
            expect(projectSource).not.toContain('__RENDERER_SCALING_ENABLED__');
            expect(scaleSource).toContain('--doodle-stage-width');
            expect(
                Object.keys(packageJson.dependencies).filter((name) =>
                    name.startsWith('@fontsource')
                )
            ).toEqual(fontDependencies);
            expect(packageJson.scripts.theme).toBe('doodle-engine theme');
            expect(packageJson.doodleEngine).toEqual({
                renderer: 'default',
                rendererTemplate,
                managedFontDependencies: fontDependencies,
            });
            expect(css).not.toContain('fonts.googleapis.com');

            if (rendererTemplate === 'minimal') {
                expect(css).not.toContain('--doodle-bg-primary');
                expect(css).not.toContain('@doodle-engine/react/style.css');
                expect(css).toMatch(/\.game-menu-icon\s*\{\s*display:\s*none;/);
            } else {
                expect(css).toContain('--doodle-bg-primary');
                expect(css).toContain('--doodle-spacing-md');
                expect(css).toContain(
                    "@import '@doodle-engine/react/style.css'"
                );
                expect(css).toContain('Renderer hooks shared');
                expect(css).toMatch(
                    /\.interlude-text\s*>\s*p\s*\{[^}]*animation:/s
                );
                expect(css).not.toContain('.interlude-text > p:nth-of-type(3)');
            }
        }
    );

    it('gives each generated game its own stable project identity', async () => {
        const targetDir = await makeTempDir();
        const first = await createProject('first-game', {
            targetDir,
            useDefaultRenderer: true,
            rendererTemplate: 'starter-rpg',
        });
        const second = await createProject('second-game', {
            targetDir,
            useDefaultRenderer: true,
            rendererTemplate: 'starter-rpg',
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

        const packageJson = JSON.parse(
            await readFile(join(first.projectPath, 'package.json'), 'utf-8')
        );
        expect(packageJson.dependencies['@doodle-engine/core']).toBe(
            DOODLE_VERSION
        );
        expect(packageJson.dependencies['@doodle-engine/react']).toBe(
            DOODLE_VERSION
        );
        expect(packageJson.devDependencies['@doodle-engine/cli']).toBe(
            DOODLE_VERSION
        );

        const readme = await readFile(
            join(first.projectPath, 'README.md'),
            'utf-8'
        );
        expect(readme).toContain('# first-game');
        expect(readme).toContain('npm run dev');
        expect(readme).not.toContain('{{GAME_TITLE}}');
    });

    it('creates literal English content and a commented blank locale file by default', async () => {
        const targetDir = await makeTempDir();
        const { projectPath } = await createProject('literal-game', {
            targetDir,
            useDefaultRenderer: true,
            rendererTemplate: 'starter-rpg',
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
            'BARTENDER: Welcome to the *Salty Dog*, stranger. What can I get you?'
        );
        expect(bartenderSource).toContain(
            "CHOICE What's the news around here?"
        );
        expect(bartenderSource).not.toContain('BARTENDER: "');
        expect(bartenderSource).not.toContain('CHOICE "');
        expect(bartenderSource).toContain('cD6A84B[*old coin*]');
        const tavernIntroSource = await readFile(
            join(projectPath, 'content', 'dialogues', 'tavern_intro.dlg'),
            'utf-8'
        );
        expect(tavernIntroSource).toContain(
            'NARRATOR: _You push open the heavy oak door and step inside._'
        );

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
        expect(loaded.config.title).toBe('literal-game');
        expect(loaded.config.subtitle).toBe('');
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
            rendererTemplate: 'starter-rpg',
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
        expect(
            parseRichText(loaded.registry.locales.en['bartender.rumors'])
        ).toContainEqual({
            text: 'old coin',
            bold: true,
            color: '#D6A84B',
        });
        expect(
            parseRichText(loaded.registry.locales.sv['bartender.rumors'])
        ).toContainEqual({
            text: 'gamla myntet',
            bold: true,
            color: '#D6A84B',
        });
        expect(
            parseRichText(loaded.registry.locales.en['narrator.tavern_intro'])
        ).toContainEqual({
            text: 'You push open the heavy oak door and step inside.',
            italic: true,
        });
        expect(
            parseRichText(loaded.registry.locales.sv['narrator.tavern_intro'])
        ).toContainEqual({
            text: 'Du skjuter upp den tunga ekdörren och kliver in.',
            italic: true,
        });

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
            title: 'Minimal Story',
            subtitle: 'A small beginning',
            useDefaultRenderer: true,
            rendererTemplate: 'starter-rpg',
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
        expect(loaded.config.title).toBe('Minimal Story');
        expect(loaded.config.subtitle).toBe('A small beginning');
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
            rendererTemplate: 'starter-rpg',
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
