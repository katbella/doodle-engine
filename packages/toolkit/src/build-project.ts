/**
 * Production build for a Doodle Engine project.
 *
 * This is the same build the CLI's `doodle build` runs, moved out of the command
 * so Doodle Studio's Build button runs the exact same code and produces the same
 * output. It takes explicit paths instead of reading process.cwd(), reports
 * progress through a callback instead of printing, and returns a result instead
 * of calling process.exit — so it can run inside a desktop app.
 */

import { copyFile, readdir, mkdir, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { generateAssetManifest } from './manifest';
import { generateServiceWorker } from './service-worker';
import { loadProject } from './load-project';
import { validateContent } from './validate';
import { importFromProject } from './project-modules';
import type { ValidationError } from './validate';
import type * as Vite from 'vite';

export interface BuildOptions {
    /** Absolute path to the project root (the folder that holds content/ and assets/). */
    projectDir: string;
    /** Output folder, relative to the project root. Defaults to "dist". */
    outDir?: string;
    /** Called with each progress message so the caller can show or ignore it. */
    onLog?: (message: string) => void;
}

export interface BuildResult {
    /** True when the build finished; false when validation stopped it first. */
    ok: boolean;
    /** Validation problems that blocked the build (empty when ok is true). */
    errors: ValidationError[];
    /** Wall-clock time the build took, in milliseconds. */
    durationMs: number;
    /** Absolute path to the output folder. */
    outDir: string;
    /** Paths (relative to the output folder) of the files this build wrote itself. */
    outputFiles: string[];
}

/**
 * Build a project into a static site.
 *
 * Validates first: if there are any problems it returns them and writes nothing,
 * so the caller can show them and stop. Otherwise it generates the asset
 * manifest, runs Vite, copies the project's assets into the output, and writes
 * the content, manifest, and service-worker files the runtime needs.
 */
export async function buildProject(
    options: BuildOptions
): Promise<BuildResult> {
    const { projectDir, outDir = 'dist', onLog = () => {} } = options;
    const start = Date.now();

    const assetsDir = join(projectDir, 'assets');
    const distDir = join(projectDir, outDir);

    // Validate before building; return problems instead of throwing so the
    // caller decides how to report them.
    onLog('Validating content...');
    const { registry, config, fileMap, parseErrors } =
        await loadProject(projectDir);
    const errors = [
        ...parseErrors,
        ...validateContent(registry, fileMap, config),
    ];
    if (errors.length > 0) {
        return {
            ok: false,
            errors,
            durationMs: Date.now() - start,
            outDir: distDir,
            outputFiles: [],
        };
    }

    // Generate the asset manifest before Vite so missing media fails fast.
    onLog('Generating asset manifest...');
    const manifest = await generateAssetManifest(
        assetsDir,
        projectDir, // assets live at <projectDir>/assets, served from the root
        registry,
        config,
        Date.now().toString()
    );

    // Vite comes from the project, not from here.
    const { build: viteBuild } = await importFromProject<typeof Vite>(
        projectDir,
        'vite'
    );
    const { default: react } = await importFromProject<{
        default: () => Vite.PluginOption;
    }>(projectDir, '@vitejs/plugin-react');

    await viteBuild({
        root: projectDir,
        plugins: [react()],
        // Relative URLs, so the build runs at a domain root, under a folder
        // like example.com/games/my-game/, or from a local server.
        base: './',
        build: {
            outDir,
            emptyOutDir: true,
        },
    });

    // Everything Vite just wrote is the app shell (index.html plus bundled
    // scripts and styles); the service worker caches it for offline play.
    // Listed now, before the game's media is copied in next to it.
    const shellFiles = await listFiles(distDir);

    // Copy project assets into <dist>/assets without deleting Vite's own files.
    await copyProjectAssets(assetsDir, join(distDir, 'assets'));

    // Write content JSON so `vite preview` can serve it at /api/content.
    const apiDir = join(distDir, 'api');
    await mkdir(apiDir, { recursive: true });
    await writeFile(
        join(apiDir, 'content'),
        JSON.stringify({ registry, config })
    );

    // Write the asset manifest to dist/api/manifest and dist/asset-manifest.json.
    await writeFile(join(apiDir, 'manifest'), JSON.stringify(manifest));
    await writeFile(
        join(distDir, 'asset-manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    onLog('Generating service worker...');
    await writeFile(
        join(distDir, 'sw.js'),
        generateServiceWorker(manifest, shellFiles)
    );

    return {
        ok: true,
        errors: [],
        durationMs: Date.now() - start,
        outDir: distDir,
        outputFiles: [
            'api/content',
            'api/manifest',
            'asset-manifest.json',
            'sw.js',
        ],
    };
}

/**
 * Every file under a directory, as forward-slash paths relative to it.
 */
async function listFiles(dir: string, prefix = ''): Promise<string[]> {
    const out: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            out.push(...(await listFiles(join(dir, entry.name), rel)));
        } else if (entry.isFile()) {
            out.push(rel);
        }
    }
    return out;
}

/**
 * Copy a directory tree of assets into a target directory, creating folders as
 * needed and leaving any files already in the target (such as Vite's own
 * output) in place.
 */
export async function copyProjectAssets(sourceDir: string, targetDir: string) {
    try {
        const sourceStats = await stat(sourceDir);
        if (!sourceStats.isDirectory()) return;
    } catch {
        return;
    }

    await mkdir(targetDir, { recursive: true });

    const entries = await readdir(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = join(sourceDir, entry.name);
        const targetPath = join(targetDir, entry.name);

        if (entry.isDirectory()) {
            await copyProjectAssets(sourcePath, targetPath);
        } else if (entry.isFile()) {
            await mkdir(dirname(targetPath), { recursive: true });
            await copyFile(sourcePath, targetPath);
        }
    }
}
