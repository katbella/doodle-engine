/**
 * Build command
 *
 * Builds the game into a static site
 */

import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import { join, extname, relative } from 'path';
import { parse as parseYaml } from 'yaml';
import { parseDialogue } from '@doodle-engine/core';
import { crayon } from 'crayon.js';
import { validateContent, printValidationErrors } from '../validate.js';
import { generateAssetManifest } from '../manifest.js';
import { generateServiceWorker } from '../service-worker.js';

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
        const { fileMap } = loaded;
        const errors = validateContent(registry, fileMap);

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
        await viteBuild({
            root: cwd,
            plugins: [react()],
            build: {
                outDir: 'dist',
                emptyOutDir: true,
            },
        });

        const distDir = join(cwd, 'dist');
        const publicDir = cwd; // assets live at <cwd>/assets, served from root

        // Generate asset manifest
        console.log(crayon.dim('Generating asset manifest...'));
        const manifest = await generateAssetManifest(
            join(cwd, 'assets'),
            publicDir,
            registry,
            config,
            Date.now().toString()
        );

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

/**
 * Load all content and track file paths for error reporting
 */
async function loadContent(contentDir: string) {
    const registry: any = {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    };

    const fileMap = new Map<string, string>();

    // Load each entity type (YAML files with id field)
    const entityTypes = [
        { dir: 'locations', key: 'locations' },
        { dir: 'characters', key: 'characters' },
        { dir: 'items', key: 'items' },
        { dir: 'maps', key: 'maps' },
        { dir: 'quests', key: 'quests' },
        { dir: 'journal', key: 'journalEntries' },
        { dir: 'interludes', key: 'interludes' },
    ];

    for (const { dir, key } of entityTypes) {
        const dirPath = join(contentDir, dir);
        try {
            const files = await readdir(dirPath);

            for (const file of files) {
                if (extname(file) === '.yaml' || extname(file) === '.yml') {
                    const filePath = join(dirPath, file);
                    const content = await readFile(filePath, 'utf-8');
                    const data = parseYaml(content);

                    if (data && data.id) {
                        registry[key][data.id] = data;
                        fileMap.set(data.id, relative(process.cwd(), filePath));
                    }
                }
            }
        } catch {
            // Directory might not exist, skip
        }
    }

    // Load locale files
    try {
        const localesDir = join(contentDir, 'locales');
        const files = await readdir(localesDir);

        for (const file of files) {
            if (extname(file) === '.yaml' || extname(file) === '.yml') {
                const filePath = join(localesDir, file);
                const content = await readFile(filePath, 'utf-8');
                const data = parseYaml(content);
                const localeId = file.replace(/\.(yaml|yml)$/, '');
                registry.locales[localeId] = data ?? {};
            }
        }
    } catch {
        // Locales directory might not exist
    }

    // Load dialogues
    try {
        const dialoguesDir = join(contentDir, 'dialogues');
        const files = await readdir(dialoguesDir);

        for (const file of files) {
            if (extname(file) === '.dlg') {
                const filePath = join(dialoguesDir, file);
                const content = await readFile(filePath, 'utf-8');
                const dialogueId = file.replace('.dlg', '');
                const dialogue = parseDialogue(content, dialogueId);
                registry.dialogues[dialogue.id] = dialogue;
                fileMap.set(dialogue.id, relative(process.cwd(), filePath));
            }
        }
    } catch {
        // Dialogues directory might not exist
    }

    // Load game config
    let config: any = null;
    try {
        const configPath = join(contentDir, 'game.yaml');
        const configContent = await readFile(configPath, 'utf-8');
        config = parseYaml(configContent);
    } catch {
        config = {
            id: 'game',
            startLocation: '',
            startTime: { day: 1, hour: 8 },
            startFlags: {},
            startVariables: {},
            startInventory: [],
        };
    }

    return { registry, fileMap, config };
}
