import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '../create-project';
import rendererCompatibilityCss from '../templates/src/index.renderer-compat.css.txt?raw';
import {
    readRendererTheme,
    rendererThemeCss,
    switchRendererTheme,
} from '../renderer-theme';

const tempDirs: string[] = [];

async function makeProject(
    rendererTemplate:
        | 'minimal'
        | 'starter-rpg'
        | 'prose'
        | 'fable' = 'starter-rpg',
    useDefaultRenderer = true
) {
    const targetDir = await mkdtemp(join(tmpdir(), 'doodle-theme-'));
    tempDirs.push(targetDir);
    return createProject('story', {
        targetDir,
        useDefaultRenderer,
        rendererTemplate,
        contentMode: 'minimal',
    });
}

afterEach(async () => {
    while (tempDirs.length > 0) {
        await rm(tempDirs.pop()!, { recursive: true, force: true });
    }
});

describe('renderer theme switching', () => {
    it.each(['starter-rpg', 'prose', 'fable'] as const)(
        'loads shared renderer CSS before the %s theme rules',
        (template) => {
            const css = rendererThemeCss(template);
            const sharedIndex = css.indexOf('Renderer hooks shared');
            const themeIndex = css.indexOf(
                template === 'starter-rpg'
                    ? '/* Starter RPG'
                    : template === 'prose'
                      ? '/* Prose'
                      : '/* Fable'
            );

            expect(sharedIndex).toBeGreaterThan(
                css.lastIndexOf('@import', sharedIndex)
            );
            expect(sharedIndex).toBeLessThan(themeIndex);
            expect(css.slice(sharedIndex)).not.toContain('@import');
        }
    );

    it('keeps theme-specific visual decisions out of the shared base', () => {
        expect(rendererCompatibilityCss).not.toContain(
            '\n.location-banner-image {'
        );
        expect(rendererCompatibilityCss).not.toContain('\n.dialogue-speaker {');
        expect(rendererCompatibilityCss).not.toContain(
            '\n.character-list-heading'
        );
        expect(rendererCompatibilityCss).not.toContain('\n.delete-button {');
        expect(rendererCompatibilityCss).not.toMatch(
            /\.panel-parchment-body\s*\{[^}]*padding:/s
        );
    });

    it.each(['starter-rpg', 'prose', 'fable'] as const)(
        'stacks party titles below names in the %s theme',
        (template) => {
            expect(rendererThemeCss(template)).toMatch(
                /\.party-member-body\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s
            );
        }
    );

    it.each(['starter-rpg', 'prose', 'fable'] as const)(
        'styles tracked and completed quests in the %s theme',
        (template) => {
            const css = rendererThemeCss(template);

            expect(css).toContain('.journal-quests-completed');
            expect(css).toMatch(
                /\.journal-quests-completed\s*\{[^}]*margin-top:/s
            );
            expect(css).not.toMatch(
                /\.journal-quests-completed\s*\{[^}]*(?:flex|overflow):/s
            );
            expect(css).toMatch(
                /\.journal-quests\s*\{[^}]*overflow:\s*hidden auto;/s
            );
            expect(css).toMatch(
                /\.quest-description\s*\{[^}]*font:\s*600\b/s
            );
            expect(css).toContain('.quest-entry-tracked');
            expect(css).toContain('.quest-entry-complete');
            expect(css).toMatch(
                /\.quest-entry-tracked\s*\{[^}]*border-left:/s
            );
            expect(css).not.toMatch(/\.quest-entry\s*\{[^}]*border-left:/s);
            expect(css).toContain('.quest-entry-tracked .quest-stage');
            expect(css).not.toContain('.quest-entry-tracked .quest-name');
            expect(css).toMatch(
                /\.quest-track-button\s*\{[^}]*border:[^}]*background:[^}]*font:/s
            );
            expect(css).not.toContain('.quest-track-button svg');
            expect(css).not.toContain(
                '.quest-entry-complete .quest-stage::before'
            );
        }
    );

    it('leaves quest presentation out of minimal and shared compatibility CSS', () => {
        expect(rendererThemeCss('minimal')).not.toContain(
            '.quest-track-button'
        );
        expect(rendererCompatibilityCss).not.toContain('.quest-track-button');
        expect(rendererCompatibilityCss).not.toContain('.quest-entry-tracked');
        expect(rendererCompatibilityCss).not.toContain(
            '.journal > .journal-quests-completed'
        );
    });

    it('stacks party titles below names in the minimal theme', () => {
        expect(rendererThemeCss('minimal')).toMatch(
            /\.party-member-body\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s
        );
    });

    it('keeps the Prose character strip fixed-height with text-only speaking status', () => {
        const css = rendererThemeCss('prose');

        expect(css).toMatch(/\.character-list\s*\{[^}]*height:\s*98px;/s);
        expect(css).toMatch(
            /\.character-speaking-mark\s*>\s*svg\s*\{[^}]*display:\s*none;/s
        );
        expect(css).toMatch(
            /\.character-speaking-mark::after\s*\{[^}]*content:\s*'speaking';/s
        );
    });

    it('aligns Prose underline-field placeholders with their labels', () => {
        expect(rendererThemeCss('prose')).toMatch(
            /\.player-setup-input,\s*\.player-setup-textarea\s*\{[^}]*padding-inline:\s*0;/s
        );
    });

    it('keeps horizontal padding inside Fable filled fields', () => {
        const css = rendererThemeCss('fable');

        expect(css).toMatch(
            /\.player-setup-input,\s*\.player-setup-textarea\s*\{[^}]*padding:\s*13px 15px;/s
        );
        expect(css).not.toMatch(
            /\.player-setup-input,\s*\.player-setup-textarea\s*\{[^}]*padding-inline:\s*0;/s
        );
    });

    it.each(['starter-rpg', 'prose', 'fable'] as const)(
        'keeps the %s loading action centered in generated theme CSS',
        (template) => {
            const css = rendererThemeCss(template);

            expect(css).toMatch(
                /\.title-button\.loading-screen-start\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s
            );
            expect(css).toMatch(
                /\.loading-screen-start\s+\.title-button-label\s*\{[^}]*text-align:\s*center;/s
            );
        }
    );

    it('gives the standalone Prose credits action horizontal padding', () => {
        expect(rendererThemeCss('prose')).toMatch(
            /\.credits-back-button\s+\.title-button-label\s*\{[^}]*padding-inline:\s*24px;/s
        );
    });

    it.each(['starter-rpg', 'prose', 'fable'] as const)(
        'does not emit dead renderer selectors in the %s theme',
        (template) => {
            const css = rendererThemeCss(template);

            expect(css).not.toMatch(
                /\.(?:location-banner-hem|settings-row(?:-label)?|settings-textsize-select|doodle-art-slot)(?![-\w])/s
            );
        }
    );

    it.each(['starter-rpg', 'prose'] as const)(
        'does not build a suppressed tooltip in the %s theme',
        (template) => {
            expect(rendererThemeCss(template)).not.toContain('.doodle-tooltip');
        }
    );

    it('replaces only managed theme CSS and updates managed fonts', async () => {
        const { projectPath } = await makeProject();
        const overridesPath = join(
            projectPath,
            'src',
            'renderer-overrides.css'
        );
        const customization = ':root { --doodle-accent: rebeccapurple; }\n';
        await writeFile(overridesPath, customization);

        const result = await switchRendererTheme(projectPath, 'prose');

        expect(result).toEqual({
            previousTemplate: 'starter-rpg',
            template: 'prose',
            dependenciesChanged: true,
        });
        expect(await readFile(overridesPath, 'utf-8')).toBe(customization);
        expect(
            await readFile(
                join(projectPath, 'src', 'renderer-theme.css'),
                'utf-8'
            )
        ).toContain('/* Prose');

        const pkg = JSON.parse(
            await readFile(join(projectPath, 'package.json'), 'utf-8')
        );
        expect(pkg.dependencies['@fontsource/spectral']).toBe('5.3.0');
        expect(
            pkg.dependencies['@fontsource-variable/public-sans']
        ).toBeUndefined();
        expect(pkg.doodleEngine).toEqual({
            renderer: 'default',
            rendererTemplate: 'prose',
            managedFontDependencies: ['@fontsource/spectral'],
        });
        await expect(readRendererTheme(projectPath)).resolves.toEqual({
            renderer: 'default',
            template: 'prose',
        });
    });

    it('does not report font changes when the theme stays the same', async () => {
        const { projectPath } = await makeProject('prose');

        const result = await switchRendererTheme(projectPath, 'prose');

        expect(result.dependenciesChanged).toBe(false);
    });

    it('enables scaling when switching from minimal to a styled theme', async () => {
        const { projectPath } = await makeProject('minimal');

        await switchRendererTheme(projectPath, 'fable');

        expect(
            await readFile(join(projectPath, 'src', 'project.ts'), 'utf-8')
        ).toMatch(/RENDERER_SCALING\s*=\s*\{\s*enabled:\s*true,/);
    });

    it('disables scaling when switching to minimal', async () => {
        const { projectPath } = await makeProject('prose');

        await switchRendererTheme(projectPath, 'minimal');

        expect(
            await readFile(join(projectPath, 'src', 'project.ts'), 'utf-8')
        ).toMatch(/RENDERER_SCALING\s*=\s*\{\s*enabled:\s*false,/);
    });

    it('can switch preview CSS without changing its full font set', async () => {
        const { projectPath } = await makeProject('prose');
        const packagePath = join(projectPath, 'package.json');
        const pkg = JSON.parse(await readFile(packagePath, 'utf-8'));
        pkg.dependencies = {
            ...pkg.dependencies,
            '@fontsource-variable/cormorant-garamond': '5.3.0',
            '@fontsource-variable/eb-garamond': '5.3.0',
            '@fontsource-variable/public-sans': '5.3.0',
            '@fontsource-variable/source-serif-4': '5.3.0',
        };
        pkg.doodleEngine.manageFontDependencies = false;
        await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');

        const result = await switchRendererTheme(projectPath, 'fable');
        const switched = JSON.parse(await readFile(packagePath, 'utf-8'));

        expect(result.dependenciesChanged).toBe(false);
        expect(switched.dependencies).toEqual(pkg.dependencies);
        expect(switched.doodleEngine).toEqual({
            renderer: 'default',
            rendererTemplate: 'fable',
            managedFontDependencies: [],
            manageFontDependencies: false,
        });
    });

    it('preserves package.json formatting while switching themes', async () => {
        const { projectPath } = await makeProject('prose');
        const packagePath = join(projectPath, 'package.json');
        const pkg = JSON.parse(await readFile(packagePath, 'utf-8'));
        await writeFile(
            packagePath,
            JSON.stringify(pkg, null, 4).replace(/\n/g, '\r\n') + '\r\n'
        );

        await switchRendererTheme(projectPath, 'fable');

        const switched = await readFile(packagePath, 'utf-8');
        expect(switched).toContain('\r\n    "name"');
        expect(switched).not.toContain('\n  "name"');
    });

    it('does not apply built-in themes to a custom renderer', async () => {
        const { projectPath } = await makeProject('minimal', false);

        await expect(switchRendererTheme(projectPath, 'fable')).rejects.toThrow(
            'default React renderer'
        );
    });
});
