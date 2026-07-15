/**
 * Shared content loader, used by both the CLI (validate, build, dev) and Doodle
 * Studio.
 *
 * Loads YAML entities, locale files, dialogues, and game.yaml from a content
 * directory. Every file is read and parsed on its own, so one broken file
 * becomes a reported problem (in parseErrors) instead of stopping the load or
 * hiding the files after it. Two files of the same type that claim the same id
 * are also reported; the first file (alphabetically) wins until the author
 * fixes the clash.
 *
 * File paths in fileMap are keyed by entity type and id together, in the form
 * "<collection>:<id>" (for example "locations:town" or "dialogues:intro"),
 * because different types may legitimately use the same id. Use fileMapKey()
 * to build a key. Paths are relative to a base directory the caller passes in,
 * not to process.cwd(), so this works the same no matter where the app runs.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, relative, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import { parseDialogue } from '@doodle-engine/core';
import type { ContentRegistry, GameConfig } from '@doodle-engine/core';
import type { ValidationError } from './validate.js';

export interface LoadedContent {
    registry: ContentRegistry;
    /** Source file for each entity, keyed by fileMapKey(collection, id). */
    fileMap: Map<string, string>;
    config: GameConfig;
    parseErrors: ValidationError[];
}

/** The registry collection each content folder loads into. */
const ENTITY_TYPES = [
    { dir: 'locations', key: 'locations' },
    { dir: 'characters', key: 'characters' },
    { dir: 'items', key: 'items' },
    { dir: 'maps', key: 'maps' },
    { dir: 'quests', key: 'quests' },
    { dir: 'journal', key: 'journalEntries' },
    { dir: 'interludes', key: 'interludes' },
] as const;

/**
 * The fileMap key for an entity: its registry collection plus its id.
 * Example: fileMapKey('locations', 'town') → "locations:town".
 */
export function fileMapKey(collection: string, id: string): string {
    return `${collection}:${id}`;
}

/** Yaml files in a folder, sorted so loading order never depends on the OS. */
async function yamlFilesIn(dirPath: string): Promise<string[]> {
    let files: string[];
    try {
        files = await readdir(dirPath);
    } catch {
        // The folder does not exist; that just means no content of this type.
        return [];
    }
    return files
        .filter((file) => extname(file) === '.yaml' || extname(file) === '.yml')
        .sort();
}

export async function loadContent(
    contentDir: string,
    baseDir: string = dirname(contentDir)
): Promise<LoadedContent> {
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
        for (const file of await yamlFilesIn(dirPath)) {
            const filePath = join(dirPath, file);
            const relPath = relative(baseDir, filePath);
            let data: any;
            try {
                data = parseYaml(await readFile(filePath, 'utf-8'));
            } catch (error) {
                parseErrors.push({
                    file: relPath,
                    message: `Could not read this file as YAML: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    suggestion: 'Fix the YAML syntax error in this file',
                });
                continue;
            }
            if (!data || typeof data !== 'object' || !data.id) {
                parseErrors.push({
                    file: relPath,
                    message: 'This file has no "id" field, so it cannot be loaded',
                    suggestion: 'Give it a unique id, like the other files in this folder',
                });
                continue;
            }

            const mapKey = fileMapKey(key, data.id);
            const existing = fileMap.get(mapKey);
            if (existing) {
                parseErrors.push({
                    file: relPath,
                    message: `The id "${data.id}" is already used by ${existing}`,
                    suggestion: 'Give one of the two files a different id',
                });
                continue;
            }

            registry[key][data.id] = data;
            fileMap.set(mapKey, relPath);
        }
    }

    // Locale files (flat key-value YAML, keyed by filename)
    const localesDir = join(contentDir, 'locales');
    for (const file of await yamlFilesIn(localesDir)) {
        const filePath = join(localesDir, file);
        const relPath = relative(baseDir, filePath);
        try {
            const data = parseYaml(await readFile(filePath, 'utf-8'));
            const localeId = file.replace(/\.(yaml|yml)$/, '');
            registry.locales[localeId] = data ?? {};
        } catch (error) {
            parseErrors.push({
                file: relPath,
                message: `Could not read this locale file as YAML: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                suggestion: 'Fix the YAML syntax error in this file',
            });
        }
    }

    // Dialogues (.dlg). Parse each file on its own so one bad file surfaces as
    // a reported error and does not hide the dialogues after it.
    try {
        const dialoguesDir = join(contentDir, 'dialogues');
        const files = (await readdir(dialoguesDir)).sort();
        for (const file of files) {
            if (extname(file) === '.dlg') {
                const filePath = join(dialoguesDir, file);
                const relPath = relative(baseDir, filePath);
                const dialogueId = file.replace('.dlg', '');
                try {
                    const content = await readFile(filePath, 'utf-8');
                    const dialogue = parseDialogue(content, dialogueId);
                    registry.dialogues[dialogue.id] = dialogue;
                    fileMap.set(fileMapKey('dialogues', dialogue.id), relPath);
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

    // Game config. A project without game.yaml gets defaults (validation will
    // ask for a start location); a game.yaml that exists but cannot be parsed
    // is a reported problem, never a silent fallback.
    const defaults = () => ({
        startLocation: '',
        startTime: { day: 1, hour: 8 },
        startFlags: {},
        startVariables: {},
        startInventory: [],
    });
    let config: any;
    const configPath = join(contentDir, 'game.yaml');
    let configSource: string | null = null;
    try {
        configSource = await readFile(configPath, 'utf-8');
    } catch {
        config = defaults();
    }
    if (configSource !== null) {
        try {
            config = parseYaml(configSource) ?? defaults();
        } catch (error) {
            parseErrors.push({
                file: relative(baseDir, configPath),
                message: `Could not read game.yaml as YAML: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                suggestion: 'Fix the YAML syntax error in game.yaml',
            });
            config = defaults();
        }
    }

    return { registry, fileMap, config, parseErrors };
}

/**
 * Load a whole project by its root directory.
 *
 * The content lives in `<projectDir>/content`, and file paths in the returned
 * fileMap are relative to the project root — the same shape the CLI reports.
 */
export async function loadProject(projectDir: string): Promise<LoadedContent> {
    return loadContent(join(projectDir, 'content'), projectDir);
}
