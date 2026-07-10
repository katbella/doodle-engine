/**
 * Shared content loader for the CLI (validate, build, dev).
 *
 * Loads YAML entities, locale files, dialogues, and game.yaml from a content
 * directory. Each dialogue is parsed on its own, so a single malformed .dlg
 * becomes a reported error (in parseErrors) instead of stopping the load or
 * hiding the dialogues in other files.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { parse as parseYaml } from 'yaml';
import { parseDialogue } from '@doodle-engine/core';
import type { ValidationError } from './validate.js';

export interface LoadedContent {
    registry: any;
    fileMap: Map<string, string>;
    config: any;
    parseErrors: ValidationError[];
}

const ENTITY_TYPES = [
    { dir: 'locations', key: 'locations' },
    { dir: 'characters', key: 'characters' },
    { dir: 'items', key: 'items' },
    { dir: 'maps', key: 'maps' },
    { dir: 'quests', key: 'quests' },
    { dir: 'journal', key: 'journalEntries' },
    { dir: 'interludes', key: 'interludes' },
];

export async function loadContent(contentDir: string): Promise<LoadedContent> {
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
    const parseErrors: ValidationError[] = [];

    // Entity YAML files (each has an id field)
    for (const { dir, key } of ENTITY_TYPES) {
        const dirPath = join(contentDir, dir);
        try {
            const files = await readdir(dirPath);
            for (const file of files) {
                if (extname(file) === '.yaml' || extname(file) === '.yml') {
                    const filePath = join(dirPath, file);
                    const data = parseYaml(await readFile(filePath, 'utf-8'));
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

    // Locale files (flat key-value YAML, keyed by filename)
    try {
        const localesDir = join(contentDir, 'locales');
        const files = await readdir(localesDir);
        for (const file of files) {
            if (extname(file) === '.yaml' || extname(file) === '.yml') {
                const filePath = join(localesDir, file);
                const data = parseYaml(await readFile(filePath, 'utf-8'));
                const localeId = file.replace(/\.(yaml|yml)$/, '');
                registry.locales[localeId] = data ?? {};
            }
        }
    } catch {
        // Locales directory might not exist
    }

    // Dialogues (.dlg). Parse each file on its own so one bad file surfaces as
    // a reported error and does not hide the dialogues after it.
    try {
        const dialoguesDir = join(contentDir, 'dialogues');
        const files = await readdir(dialoguesDir);
        for (const file of files) {
            if (extname(file) === '.dlg') {
                const filePath = join(dialoguesDir, file);
                const relPath = relative(process.cwd(), filePath);
                const dialogueId = file.replace('.dlg', '');
                try {
                    const content = await readFile(filePath, 'utf-8');
                    const dialogue = parseDialogue(content, dialogueId);
                    registry.dialogues[dialogue.id] = dialogue;
                    fileMap.set(dialogue.id, relPath);
                } catch (error) {
                    parseErrors.push({
                        file: relPath,
                        message: `Failed to parse dialogue: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`,
                        suggestion: 'Fix the DSL syntax error in this .dlg file',
                    });
                }
            }
        }
    } catch {
        // Dialogues directory might not exist
    }

    // Game config
    let config: any = null;
    try {
        const configPath = join(contentDir, 'game.yaml');
        config = parseYaml(await readFile(configPath, 'utf-8'));
    } catch {
        config = {
            startLocation: '',
            startTime: { day: 1, hour: 8 },
            startFlags: {},
            startVariables: {},
            startInventory: [],
        };
    }

    return { registry, fileMap, config, parseErrors };
}
