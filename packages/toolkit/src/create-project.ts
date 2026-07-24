/**
 * Scaffold a new Doodle Engine game project.
 *
 * This is the file-writing half of `doodle create`, moved out of the command so
 * both the CLI and Doodle Studio create projects from the same official
 * templates. It takes plain options instead of asking questions, and writes
 * files without printing — the caller handles any prompts and messages.
 */

import { mkdir, readdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { parse as parseYaml } from 'yaml';
import { DOODLE_VERSION } from './version';

// Vite inlines all template files as strings at build time.
// Keys are relative paths like './templates/content/game.yaml'.
const TEMPLATES = import.meta.glob('./templates/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

export type ScaffoldLocalizationMode = 'literal' | 'localized';
export type ScaffoldContentMode = 'starter' | 'minimal';

export interface CreateProjectOptions {
    /** Directory to create the new project folder inside (usually the cwd). */
    targetDir: string;
    /** Player-facing game title used by the generated HTML and renderer. */
    title?: string;
    /** Optional player-facing subtitle used by the generated renderer. */
    subtitle?: string;
    /** Use the batteries-included GameShell renderer instead of a custom one. */
    useDefaultRenderer: boolean;
    /** Include the styled starter CSS (only meaningful with the default renderer). */
    useStarterStyles: boolean;
    /** Begin with the connected example story or one valid starting location. */
    contentMode?: ScaffoldContentMode;
    /** Use literal English text or demonstrate localization with English and Swedish. */
    localizationMode?: ScaffoldLocalizationMode;
}

export interface CreateProjectResult {
    /** Absolute path to the created project folder. */
    projectPath: string;
}

/**
 * Maps a template glob key to its output path relative to the project root.
 * Returns null for files that need special handling (App variants, CSS variants).
 */
function resolveOutputPath(key: string): string | null {
    // Strip the './templates/' prefix
    const rel = key.replace('./templates/', '');

    // App variant files are picked separately; skip in main loop
    if (rel === 'src/App.default.tsx' || rel === 'src/App.custom.tsx')
        return null;

    // CSS variant files are picked separately; skip in main loop
    if (rel === 'src/index.minimal.css' || rel === 'src/index.starter.css')
        return null;

    // _root/ files go to the project root
    if (rel.startsWith('_root/')) {
        const filename = rel.slice('_root/'.length);
        // _gitignore is written as .gitignore (leading _ becomes .)
        return filename.startsWith('_') ? '.' + filename.slice(1) : filename;
    }

    return rel;
}

/**
 * Create a new project on disk from the official templates.
 *
 * Writes the directory structure, a generated package.json, every template
 * file, and the App/CSS variants that match the chosen renderer and styles.
 */
export async function createProject(
    projectName: string,
    options: CreateProjectOptions
): Promise<CreateProjectResult> {
    const { targetDir, useDefaultRenderer, useStarterStyles } = options;
    const title = options.title?.trim() || projectName;
    const subtitle = options.subtitle?.trim() ?? '';
    const projectId = randomUUID();
    const contentMode = options.contentMode ?? 'starter';
    const localizationMode = options.localizationMode ?? 'literal';
    const projectPath = join(targetDir, projectName);

    // Creating a project never touches existing work: the destination must
    // be brand new or an empty folder.
    let existing: string[] | null = null;
    try {
        existing = await readdir(projectPath);
    } catch {
        // The folder does not exist yet; that is the normal case.
    }
    if (existing && existing.length > 0) {
        throw new Error(
            `The folder "${projectPath}" already exists and is not empty. ` +
                `Choose a new name or an empty folder.`
        );
    }

    // Create directory structure
    const dirs = [
        'content/locations',
        'content/characters',
        'content/items',
        'content/dialogues',
        'content/quests',
        'content/journal',
        'content/interludes',
        'content/locales',
        'content/maps',
        'assets/images/banners',
        'assets/images/portraits',
        'assets/images/items',
        'assets/images/maps',
        'assets/images/ui',
        'assets/audio/music',
        'assets/audio/sfx',
        'assets/audio/ui',
        'assets/audio/voice',
        'assets/video',
        'src',
    ];

    for (const dir of dirs) {
        await mkdir(join(projectPath, dir), { recursive: true });
    }

    // --- package.json (generated, needs projectName) ---
    const packageJson = {
        name: projectName,
        version: '0.1.0',
        type: 'module',
        scripts: {
            dev: 'doodle dev',
            build: 'doodle build',
            validate: 'doodle validate',
            preview: 'vite preview',
        },
        dependencies: {
            '@doodle-engine/core': DOODLE_VERSION,
            '@doodle-engine/react': DOODLE_VERSION,
            react: '^19.0.0',
            'react-dom': '^19.0.0',
        },
        devDependencies: {
            '@doodle-engine/cli': DOODLE_VERSION,
            '@types/react': '^19.0.0',
            '@types/react-dom': '^19.0.0',
            '@vitejs/plugin-react': '^4.3.0',
            typescript: '^5.7.0',
            vite: '^6.0.0',
        },
    };

    await writeFile(
        join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    // --- Write all template files ---
    for (const [key, content] of Object.entries(TEMPLATES)) {
        const outPath = resolveOutputPath(key);
        if (outPath === null) continue;
        if (
            contentMode === 'minimal' &&
            (outPath.startsWith('content/') || outPath.startsWith('assets/'))
        ) {
            continue;
        }
        if (
            localizationMode === 'literal' &&
            outPath === 'content/locales/sv.yaml'
        ) {
            continue;
        }

        const dest = join(projectPath, outPath);
        // Ensure parent directory exists (templates may have paths not in the dirs list)
        await mkdir(dirname(dest), { recursive: true });
        let output = content;
        if (outPath === 'index.html') {
            output = content.replace('{{GAME_TITLE}}', escapeHtml(title));
        } else if (outPath === 'content/locales/en.yaml') {
            output =
                localizationMode === 'literal'
                    ? ENGLISH_LOCALE_STARTER
                    : content;
        } else if (
            localizationMode === 'literal' &&
            outPath.startsWith('content/')
        ) {
            output = replaceLocaleKeysWithEnglish(
                content,
                outPath.endsWith('.dlg')
            );
        }
        output = output.replace(
            '__PROJECT_ID_JSON__',
            JSON.stringify(projectId)
        );
        await writeFile(dest, output);
    }

    if (contentMode === 'minimal') {
        await writeMinimalContent(projectPath, localizationMode);
    }

    // --- src/App.tsx (pick variant based on renderer choice) ---
    const appKey = useDefaultRenderer
        ? './templates/src/App.default.tsx'
        : './templates/src/App.custom.tsx';
    const app = TEMPLATES[appKey]
        .replace('__GAME_TITLE_JSON__', JSON.stringify(title))
        .replace('__GAME_SUBTITLE_JSON__', JSON.stringify(subtitle));
    await writeFile(join(projectPath, 'src/App.tsx'), app);

    // --- src/index.css (pick variant based on styles choice) ---
    const cssKey =
        useDefaultRenderer && useStarterStyles
            ? './templates/src/index.starter.css'
            : './templates/src/index.minimal.css';
    await writeFile(join(projectPath, 'src/index.css'), TEMPLATES[cssKey]);

    return { projectPath };
}

async function writeMinimalContent(
    projectPath: string,
    localizationMode: ScaffoldLocalizationMode
): Promise<void> {
    await writeFile(
        join(projectPath, 'content', 'game.yaml'),
        MINIMAL_GAME_CONFIG
    );
    await writeFile(
        join(projectPath, 'content', 'locations', 'start.yaml'),
        localizationMode === 'localized'
            ? MINIMAL_LOCALIZED_LOCATION
            : MINIMAL_LITERAL_LOCATION
    );
    await writeFile(
        join(projectPath, 'content', 'locales', 'en.yaml'),
        localizationMode === 'localized'
            ? minimalLocalizedLocale('en')
            : ENGLISH_LOCALE_STARTER
    );
    if (localizationMode === 'localized') {
        await writeFile(
            join(projectPath, 'content', 'locales', 'sv.yaml'),
            minimalLocalizedLocale('sv')
        );
    }
}

const MINIMAL_GAME_CONFIG = `# Game Configuration

startLocation: start
startTime:
  day: 1
  hour: 8
startFlags: {}
startVariables: {}
startInventory: []
`;

const MINIMAL_LITERAL_LOCATION = `id: start
name: "Starting Place"
description: "Your story begins here."
banner: ""
music: ""
ambient: ""
`;

const MINIMAL_LOCALIZED_LOCATION = `id: start
name: "@location.start.name"
description: "@location.start.description"
banner: ""
music: ""
ambient: ""
`;

function minimalLocalizedLocale(locale: 'en' | 'sv'): string {
    const source = TEMPLATES[`./templates/content/locales/${locale}.yaml`];
    const storyMarker = '# Narrator Intros';
    const markerIndex = source.indexOf(storyMarker);
    const uiSection = source
        .slice(0, source.lastIndexOf('# ===================', markerIndex))
        .trimEnd();
    const location =
        locale === 'sv'
            ? `location.start.name: "Startplats"
location.start.description: "Din berättelse börjar här."`
            : `location.start.name: "Starting Place"
location.start.description: "Your story begins here."`;
    return `${uiSection}

# ===================
# Starting Location
# ===================
${location}
`;
}

const ENGLISH_TRANSLATIONS = parseYaml(
    TEMPLATES['./templates/content/locales/en.yaml']
) as Record<string, string>;

const ENGLISH_LOCALE_STARTER = `# ===================
# English Locale Starter
# ===================
#
# This project uses literal English text, so it does not need locale keys yet.
# To localize a string later:
# 1. Replace the text in a content file with a key such as @location.tavern.name
# 2. Add that key and its English text below
# 3. Copy this file to another language code, such as sv.yaml, and translate it
# Locale filenames become language codes automatically; no React changes are needed.
#
# ===================
# Example
# ===================
# location.tavern.name: "The Salty Dog"
#
# Built-in interface labels can also be overridden, for example:
# ui.continue: "Continue"
# ui.end_dialogue: "End Dialogue"
`;

function replaceLocaleKeysWithEnglish(
    content: string,
    isDialogue: boolean
): string {
    return content
        .split(/(\r?\n)/)
        .map((part) => {
            if (/^\r?\n$/.test(part) || part.trimStart().startsWith('#')) {
                return part;
            }

            const indentation = part.match(/^\s*/)?.[0] ?? '';
            return part.replace(
                /"@([A-Za-z0-9_.-]+)"|@([A-Za-z0-9_.-]+)/g,
                (_match, quotedKey: string, plainKey: string) => {
                    const translation = englishTranslation(
                        quotedKey ?? plainKey
                    );
                    const formatted = isDialogue
                        ? formatDialogueText(translation)
                        : JSON.stringify(translation);
                    return isDialogue
                        ? formatted.replace(/\n/g, `\n${indentation}`)
                        : formatted;
                }
            );
        })
        .join('');
}

function formatDialogueText(text: string): string {
    if (text.includes('\n') || text.includes('#') || text.includes('"')) {
        return `"${text.replace(/[\\"]/g, (character) => '\\' + character)}"`;
    }
    return text;
}

function englishTranslation(key: string): string {
    const value = ENGLISH_TRANSLATIONS[key];
    if (typeof value !== 'string') {
        throw new Error(
            `Starter content is missing the English locale key "${key}".`
        );
    }
    return value;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
