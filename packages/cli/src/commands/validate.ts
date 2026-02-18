/**
 * Validate command
 *
 * Validates all content in the content directory and reports errors.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { parse as parseYaml } from 'yaml';
import { parseDialogue } from '@doodle-engine/core';
import { crayon } from 'crayon.js';
import { validateContent, printValidationErrors } from '../validate.js';

export async function validate() {
    const cwd = process.cwd();
    const contentDir = join(cwd, 'content');

    console.log('');
    console.log(crayon.bold.magenta('🐾 Validating Doodle Engine content...'));
    console.log('');

    try {
        const { registry, fileMap } = await loadContent(contentDir);
        const errors = validateContent(registry, fileMap);

        printValidationErrors(errors);

        if (errors.length > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(crayon.red('Error loading content:'), error);
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

    return { registry, fileMap };
}
