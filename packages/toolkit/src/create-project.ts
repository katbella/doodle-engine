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

// Vite inlines all template files as strings at build time.
// Keys are relative paths like './templates/content/game.yaml'.
const TEMPLATES = import.meta.glob('./templates/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

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
        // _gitignore → .gitignore  (leading _ becomes .)
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
            '@doodle-engine/core': 'latest',
            '@doodle-engine/react': 'latest',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
        },
        devDependencies: {
            '@doodle-engine/cli': 'latest',
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

        const dest = join(projectPath, outPath);
        // Ensure parent directory exists (templates may have paths not in the dirs list)
        await mkdir(dirname(dest), { recursive: true });
        const output =
            outPath === 'index.html'
                ? content.replace('{{GAME_TITLE}}', escapeHtml(title))
                : content;
        await writeFile(dest, output);
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

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
