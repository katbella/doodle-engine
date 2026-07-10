/**
 * Build command
 *
 * Builds the game into a static site
 */

import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, readdir, mkdir, stat, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { crayon } from 'crayon.js';
import { validateContent, printValidationErrors } from '../validate.js';
import { generateAssetManifest } from '../manifest.js';
import { generateServiceWorker } from '../service-worker.js';
import { loadContent } from '../content-loader.js';

export async function build() {
    const cwd = process.cwd();
    const contentDir = join(cwd, 'content');

    console.log('');
    console.log(crayon.bold.magenta('🐕 Building Doodle Engine game...'));
    console.log('');

    // Run validation and load content
    console.log(crayon.dim('Validating content...'));
    let loadedContent: any;
    let registry: any;
    let config: any;
    try {
        const loaded = await loadContent(contentDir);
        registry = loaded.registry;
        config = loaded.config;
        const { fileMap, parseErrors } = loaded;
        const errors = [
            ...parseErrors,
            ...validateContent(registry, fileMap, config),
        ];

        printValidationErrors(errors);

        if (errors.length > 0) {
            console.log(crayon.red('Build failed due to validation errors.'));
            console.log('');
            process.exit(1);
        }

        loadedContent = { registry, config };
    } catch (error) {
        console.error(crayon.red('Error loading content:'), error);
        process.exit(1);
    }

    console.log('');

    // Proceed with build
    try {
        const publicDir = cwd; // assets live at <cwd>/assets, served from root
        const assetsDir = join(cwd, 'assets');

        // Generate asset manifest before Vite so missing media fails fast.
        console.log(crayon.dim('Generating asset manifest...'));
        const manifest = await generateAssetManifest(
            assetsDir,
            publicDir,
            registry,
            config,
            Date.now().toString()
        );

        await viteBuild({
            root: cwd,
            plugins: [react()],
            build: {
                outDir: 'dist',
                emptyOutDir: true,
            },
        });

        const distDir = join(cwd, 'dist');

        // Copy project assets into dist/assets without deleting Vite's own files.
        await copyProjectAssets(assetsDir, join(distDir, 'assets'));

        // Write content JSON to dist so vite preview can serve it at /api/content
        const apiDir = join(distDir, 'api');
        await mkdir(apiDir, { recursive: true });
        await writeFile(join(apiDir, 'content'), JSON.stringify(loadedContent));

        // Write asset manifest to dist/api/manifest and dist/asset-manifest.json
        await writeFile(join(apiDir, 'manifest'), JSON.stringify(manifest));
        await writeFile(
            join(distDir, 'asset-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );

        // Generate and write service worker
        console.log(crayon.dim('Generating service worker...'));
        const swSource = generateServiceWorker(manifest);
        await writeFile(join(distDir, 'sw.js'), swSource);

        console.log('');
        console.log(crayon.green('✅ Build complete! Output in dist/'));
        console.log('');
        console.log('To preview the build:');
        console.log(crayon.dim('  yarn preview'));
        console.log('');
    } catch (error) {
        console.error(crayon.red('Build failed:'), error);
        process.exit(1);
    }
}

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
