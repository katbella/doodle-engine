import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import minimalCss from './templates/src/index.minimal.css.txt?raw';
import starterRpgCss from './templates/src/index.starter-rpg.css.txt?raw';
import proseCss from './templates/src/index.prose.css.txt?raw';
import fableCss from './templates/src/index.fable.css.txt?raw';
import rendererCompatibilityCss from './templates/src/index.renderer-compat.css.txt?raw';

export const RENDERER_TEMPLATES = [
    'minimal',
    'starter-rpg',
    'prose',
    'fable',
] as const;

export type RendererTemplate = (typeof RENDERER_TEMPLATES)[number];

const THEME_CSS: Record<RendererTemplate, string> = {
    minimal: minimalCss,
    'starter-rpg': starterRpgCss,
    prose: proseCss,
    fable: fableCss,
};

const FONT_DEPENDENCIES: Record<RendererTemplate, Record<string, string>> = {
    minimal: {},
    'starter-rpg': {
        '@fontsource-variable/public-sans': '5.3.0',
    },
    prose: {
        '@fontsource/spectral': '5.3.0',
    },
    fable: {
        '@fontsource-variable/cormorant-garamond': '5.3.0',
        '@fontsource-variable/eb-garamond': '5.3.0',
        '@fontsource-variable/source-serif-4': '5.3.0',
    },
};

const THEME_MARKERS: Record<RendererTemplate, string> = {
    minimal: '/* Minimal',
    'starter-rpg': '/* Starter RPG',
    prose: '/* Prose',
    fable: '/* Fable',
};

interface DoodleEnginePackageMetadata {
    renderer: 'default' | 'custom';
    rendererTemplate: RendererTemplate;
    managedFontDependencies: string[];
}

interface ProjectPackage {
    dependencies?: Record<string, string>;
    doodleEngine?: Partial<DoodleEnginePackageMetadata>;
    [key: string]: unknown;
}

export interface RendererThemeInfo {
    renderer: 'default' | 'custom';
    template: RendererTemplate | null;
}

export interface SwitchRendererThemeResult {
    previousTemplate: RendererTemplate;
    template: RendererTemplate;
    dependenciesChanged: boolean;
}

export function isRendererTemplate(value: string): value is RendererTemplate {
    return RENDERER_TEMPLATES.includes(value as RendererTemplate);
}

export function rendererThemeCss(template: RendererTemplate): string {
    const compatibility =
        template === 'minimal' ? '' : `\n\n${rendererCompatibilityCss}`;
    return THEME_CSS[template] + compatibility;
}

export function rendererFontDependencies(
    template: RendererTemplate
): Record<string, string> {
    return { ...FONT_DEPENDENCIES[template] };
}

export function rendererProjectMetadata(
    renderer: 'default' | 'custom',
    template: RendererTemplate
): DoodleEnginePackageMetadata {
    return {
        renderer,
        rendererTemplate: template,
        managedFontDependencies: Object.keys(FONT_DEPENDENCIES[template]),
    };
}

export async function readRendererTheme(
    projectDir: string
): Promise<RendererThemeInfo> {
    const pkg = await readProjectPackage(projectDir);
    const metadata = pkg.doodleEngine;
    if (metadata?.renderer === 'custom') {
        return {
            renderer: 'custom',
            template: isRendererTemplate(metadata.rendererTemplate ?? '')
                ? metadata.rendererTemplate!
                : null,
        };
    }

    const app = await readOptional(join(projectDir, 'src', 'App.tsx'));
    const renderer = app?.includes('GameShell') ? 'default' : 'custom';
    if (renderer === 'custom') {
        return {
            renderer,
            template: null,
        };
    }

    const managedTheme = await readOptional(
        join(projectDir, 'src', 'renderer-theme.css')
    );
    const detected = detectRendererTemplate(managedTheme ?? '');
    const declared = isRendererTemplate(metadata?.rendererTemplate ?? '')
        ? metadata!.rendererTemplate!
        : null;

    return {
        renderer,
        template: declared ?? detected,
    };
}

export async function switchRendererTheme(
    projectDir: string,
    template: RendererTemplate
): Promise<SwitchRendererThemeResult> {
    const pkg = await readProjectPackage(projectDir);
    const info = await readRendererTheme(projectDir);
    if (info.renderer !== 'default') {
        throw new Error(
            'Renderer themes can only be switched for projects using the default React renderer.'
        );
    }
    if (!info.template) {
        throw new Error(
            'The current renderer theme could not be identified. Restore a generated theme stylesheet before switching.'
        );
    }

    const dependencies = { ...(pkg.dependencies ?? {}) };
    const originalDependencies = { ...dependencies };
    const previousManaged =
        pkg.doodleEngine?.managedFontDependencies ??
        Object.keys(FONT_DEPENDENCIES[info.template]);
    for (const dependency of previousManaged) {
        const managedVersions = Object.values(FONT_DEPENDENCIES)
            .map((fonts) => fonts[dependency])
            .filter(Boolean);
        if (
            dependencies[dependency] &&
            managedVersions.includes(dependencies[dependency])
        ) {
            delete dependencies[dependency];
        }
    }
    for (const [dependency, version] of Object.entries(
        FONT_DEPENDENCIES[template]
    )) {
        if (dependencies[dependency] !== version) {
            dependencies[dependency] = version;
        }
    }
    const dependenciesChanged = !recordsEqual(
        originalDependencies,
        dependencies
    );

    const nextPackage: ProjectPackage = {
        ...pkg,
        dependencies,
        doodleEngine: rendererProjectMetadata('default', template),
    };

    await writeFile(
        join(projectDir, 'src', 'renderer-theme.css'),
        rendererThemeCss(template)
    );
    await writeFile(
        join(projectDir, 'package.json'),
        JSON.stringify(nextPackage, null, 2) + '\n'
    );

    return {
        previousTemplate: info.template,
        template,
        dependenciesChanged,
    };
}

function detectRendererTemplate(css: string): RendererTemplate | null {
    return (
        RENDERER_TEMPLATES.find((template) =>
            css.includes(THEME_MARKERS[template])
        ) ?? null
    );
}

async function readProjectPackage(projectDir: string): Promise<ProjectPackage> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(
            await readFile(join(projectDir, 'package.json'), 'utf-8')
        );
    } catch {
        throw new Error(
            'The current folder is not a Doodle Engine project with a readable package.json.'
        );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('The project package.json must contain a JSON object.');
    }
    return parsed as ProjectPackage;
}

async function readOptional(path: string): Promise<string | null> {
    try {
        return await readFile(path, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
    }
}

function recordsEqual(
    left: Record<string, string>,
    right: Record<string, string>
): boolean {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => left[key] === right[key]);
}
