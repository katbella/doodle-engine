import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject } from '../create-project';
import { readRendererTheme, switchRendererTheme } from '../renderer-theme';

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

    it('does not apply built-in themes to a custom renderer', async () => {
        const { projectPath } = await makeProject('minimal', false);

        await expect(switchRendererTheme(projectPath, 'fable')).rejects.toThrow(
            'default React renderer'
        );
    });
});
