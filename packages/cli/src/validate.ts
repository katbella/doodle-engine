/**
 * Content validation for Doodle Engine.
 *
 * Validates dialogues, content references, and localization keys.
 */

import { crayon } from 'crayon.js';
import type { ContentRegistry } from '@doodle-engine/core';
import type { Dialogue, DialogueNode, GameConfig } from '@doodle-engine/core';

export interface ValidationError {
    file: string;
    line?: number;
    message: string;
    suggestion?: string;
}

/**
 * Validate all content in the registry.
 *
 * @param registry - Content registry to validate
 * @param fileMap - Map of entity IDs to file paths (for error reporting)
 * @returns Array of validation errors
 */
export function validateContent(
    registry: ContentRegistry,
    fileMap: Map<string, string>,
    config?: GameConfig
): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate dialogues
    for (const dialogue of Object.values(registry.dialogues)) {
        const file = fileMap.get(dialogue.id) || `dialogue:${dialogue.id}`;
        errors.push(...validateDialogue(dialogue, file));
    }

    // Validate character dialogue references
    for (const character of Object.values(registry.characters)) {
        if (character.dialogue && !registry.dialogues[character.dialogue]) {
            const file =
                fileMap.get(character.id) || `character:${character.id}`;
            errors.push({
                file,
                message: `Character "${character.id}" references non-existent dialogue "${character.dialogue}"`,
                suggestion: `Create dialogue "${character.dialogue}" or fix the reference`,
            });
        }
    }

    // Validate map structure
    errors.push(...validateMaps(registry, fileMap));

    // Validate content references
    errors.push(...validateReferences(registry, fileMap, config));

    // Validate localization keys
    errors.push(...validateLocalizationKeys(registry, fileMap));

    return errors;
}

function validateReferences(
    registry: ContentRegistry,
    fileMap: Map<string, string>,
    config?: GameConfig
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (config) {
        if (!hasValue(config.startLocation)) {
            errors.push({
                file: 'content/game.yaml',
                message: 'Game config missing required "startLocation"',
                suggestion: 'Set startLocation to an existing location ID',
            });
        } else if (!registry.locations[config.startLocation]) {
            errors.push({
                file: 'content/game.yaml',
                message: `Game config startLocation "${config.startLocation}" does not exist`,
                suggestion: `Create location "${config.startLocation}" or update startLocation`,
            });
        }

        if (!config.startTime || config.startTime.day === undefined || config.startTime.hour === undefined) {
            errors.push({
                file: 'content/game.yaml',
                message: 'Game config missing required "startTime.day" or "startTime.hour"',
                suggestion: 'Set startTime.day and startTime.hour',
            });
        }

        if (!Array.isArray(config.startInventory)) {
            errors.push({
                file: 'content/game.yaml',
                message: 'Game config startInventory must be an array',
                suggestion: 'Set startInventory to [] or a list of item IDs',
            });
        } else {
            for (const itemId of config.startInventory) {
                if (!registry.items[itemId]) {
                    errors.push({
                        file: 'content/game.yaml',
                        message: `Game config startInventory references non-existent item "${itemId}"`,
                        suggestion: `Create item "${itemId}" or remove it from startInventory`,
                    });
                }
            }
        }
    }

    for (const character of Object.values(registry.characters)) {
        if (character.location && !registry.locations[character.location]) {
            errors.push({
                file: fileMap.get(character.id) || `character:${character.id}`,
                message: `Character "${character.id}" starts at non-existent location "${character.location}"`,
                suggestion: `Create location "${character.location}" or update the character location`,
            });
        }
    }

    for (const item of Object.values(registry.items)) {
        if (
            item.location !== 'inventory' &&
            !registry.locations[item.location] &&
            !registry.characters[item.location]
        ) {
            errors.push({
                file: fileMap.get(item.id) || `item:${item.id}`,
                message: `Item "${item.id}" starts at non-existent location or character "${item.location}"`,
                suggestion: `Use "inventory", an existing location ID, or an existing character ID`,
            });
        }
    }

    for (const dialogue of Object.values(registry.dialogues)) {
        const file = fileMap.get(dialogue.id) || `dialogue:${dialogue.id}`;
        if (
            dialogue.triggerLocation &&
            !registry.locations[dialogue.triggerLocation]
        ) {
            errors.push({
                file,
                message: `Dialogue "${dialogue.id}" triggers at non-existent location "${dialogue.triggerLocation}"`,
                suggestion: `Create location "${dialogue.triggerLocation}" or update the TRIGGER`,
            });
        }

        for (const node of dialogue.nodes) {
            validateNodeReferences(node, file, registry, errors);
        }
    }

    for (const interlude of Object.values(registry.interludes)) {
        const file = fileMap.get(interlude.id) || `interlude:${interlude.id}`;
        if (
            interlude.triggerLocation &&
            !registry.locations[interlude.triggerLocation]
        ) {
            errors.push({
                file,
                message: `Interlude "${interlude.id}" triggers at non-existent location "${interlude.triggerLocation}"`,
                suggestion: `Create location "${interlude.triggerLocation}" or update triggerLocation`,
            });
        }

        for (const effect of interlude.effects ?? []) {
            validateEffectReferences(effect, interlude.id, file, registry, errors);
        }
    }

    return errors;
}

function hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

function validateNodeReferences(
    node: DialogueNode,
    file: string,
    registry: ContentRegistry,
    errors: ValidationError[]
) {
    for (const condition of node.conditions ?? []) {
        validateConditionReferences(condition, node.id, file, registry, errors);
    }
    for (const effect of node.effects ?? []) {
        validateEffectReferences(effect, node.id, file, registry, errors);
    }
    for (const branch of node.conditionalBranches ?? []) {
        validateConditionReferences(branch.condition, node.id, file, registry, errors);
        for (const effect of branch.effects ?? []) {
            validateEffectReferences(effect, node.id, file, registry, errors);
        }
    }
    for (const choice of node.choices) {
        for (const condition of choice.conditions ?? []) {
            validateConditionReferences(condition, node.id, file, registry, errors);
        }
        for (const effect of choice.effects ?? []) {
            validateEffectReferences(effect, node.id, file, registry, errors);
        }
    }
}

function validateConditionReferences(
    condition: any,
    nodeId: string,
    file: string,
    registry: ContentRegistry,
    errors: ValidationError[]
) {
    const missing = (message: string, suggestion: string) =>
        errors.push({ file, message: `Node "${nodeId}" ${message}`, suggestion });

    if (
        condition.type === 'atLocation' &&
        hasValue(condition.locationId) &&
        !registry.locations[condition.locationId]
    ) {
        missing(
            `condition "atLocation" references non-existent location "${condition.locationId}"`,
            `Create location "${condition.locationId}" or update the condition`
        );
    } else if (
        condition.type === 'characterAt' &&
        hasValue(condition.characterId) &&
        !registry.characters[condition.characterId]
    ) {
        missing(
            `condition "characterAt" references non-existent character "${condition.characterId}"`,
            `Create character "${condition.characterId}" or update the condition`
        );
    } else if (
        condition.type === 'characterAt' &&
        hasValue(condition.locationId) &&
        !registry.locations[condition.locationId]
    ) {
        missing(
            `condition "characterAt" references non-existent location "${condition.locationId}"`,
            `Create location "${condition.locationId}" or update the condition`
        );
    } else if (
        condition.type === 'characterInParty' &&
        hasValue(condition.characterId) &&
        !registry.characters[condition.characterId]
    ) {
        missing(
            `condition "characterInParty" references non-existent character "${condition.characterId}"`,
            `Create character "${condition.characterId}" or update the condition`
        );
    } else if (
        (condition.type === 'relationshipAbove' ||
            condition.type === 'relationshipBelow') &&
        hasValue(condition.characterId) &&
        !registry.characters[condition.characterId]
    ) {
        missing(
            `condition "${condition.type}" references non-existent character "${condition.characterId}"`,
            `Create character "${condition.characterId}" or update the condition`
        );
    } else if (
        condition.type === 'hasItem' &&
        hasValue(condition.itemId) &&
        !registry.items[condition.itemId]
    ) {
        missing(
            `condition "hasItem" references non-existent item "${condition.itemId}"`,
            `Create item "${condition.itemId}" or update the condition`
        );
    } else if (
        condition.type === 'itemAt' &&
        hasValue(condition.itemId) &&
        !registry.items[condition.itemId]
    ) {
        missing(
            `condition "itemAt" references non-existent item "${condition.itemId}"`,
            `Create item "${condition.itemId}" or update the condition`
        );
    } else if (
        condition.type === 'itemAt' &&
        hasValue(condition.locationId) &&
        condition.locationId !== 'inventory' &&
        !registry.locations[condition.locationId] &&
        !registry.characters[condition.locationId]
    ) {
        missing(
            `condition "itemAt" references non-existent location or character "${condition.locationId}"`,
            `Use "inventory", an existing location ID, or an existing character ID`
        );
    } else if (
        condition.type === 'questAtStage' &&
        hasValue(condition.questId) &&
        !registry.quests[condition.questId]
    ) {
        missing(
            `condition "questAtStage" references non-existent quest "${condition.questId}"`,
            `Create quest "${condition.questId}" or update the condition`
        );
    } else if (
        condition.type === 'questAtStage' &&
        hasValue(condition.questId) &&
        hasValue(condition.stageId)
    ) {
        const quest = registry.quests[condition.questId];
        if (!quest.stages.some((stage) => stage.id === condition.stageId)) {
            missing(
                `condition "questAtStage" references non-existent quest stage "${condition.questId}.${condition.stageId}"`,
                `Add stage "${condition.stageId}" to quest "${condition.questId}" or update the condition`
            );
        }
    }
}

function validateEffectReferences(
    effect: any,
    nodeId: string,
    file: string,
    registry: ContentRegistry,
    errors: ValidationError[]
) {
    const missing = (message: string, suggestion: string) =>
        errors.push({ file, message: `Node "${nodeId}" ${message}`, suggestion });

    if (
        effect.type === 'goToLocation' &&
        hasValue(effect.locationId) &&
        !registry.locations[effect.locationId]
    ) {
        missing(
            `effect "goToLocation" references non-existent location "${effect.locationId}"`,
            `Create location "${effect.locationId}" or update the effect`
        );
    } else if (
        (effect.type === 'addItem' || effect.type === 'removeItem') &&
        hasValue(effect.itemId) &&
        !registry.items[effect.itemId]
    ) {
        missing(
            `effect "${effect.type}" references non-existent item "${effect.itemId}"`,
            `Create item "${effect.itemId}" or update the effect`
        );
    } else if (
        effect.type === 'moveItem' &&
        hasValue(effect.itemId) &&
        !registry.items[effect.itemId]
    ) {
        missing(
            `effect "moveItem" references non-existent item "${effect.itemId}"`,
            `Create item "${effect.itemId}" or update the effect`
        );
    } else if (
        effect.type === 'moveItem' &&
        hasValue(effect.locationId) &&
        effect.locationId !== 'inventory' &&
        !registry.locations[effect.locationId] &&
        !registry.characters[effect.locationId]
    ) {
        missing(
            `effect "moveItem" references non-existent location or character "${effect.locationId}"`,
            `Use "inventory", an existing location ID, or an existing character ID`
        );
    } else if (
        effect.type === 'setQuestStage' &&
        hasValue(effect.questId) &&
        !registry.quests[effect.questId]
    ) {
        missing(
            `effect "setQuestStage" references non-existent quest "${effect.questId}"`,
            `Create quest "${effect.questId}" or update the effect`
        );
    } else if (
        effect.type === 'setQuestStage' &&
        hasValue(effect.questId) &&
        hasValue(effect.stageId)
    ) {
        const quest = registry.quests[effect.questId];
        if (!quest.stages.some((stage) => stage.id === effect.stageId)) {
            missing(
                `effect "setQuestStage" references non-existent quest stage "${effect.questId}.${effect.stageId}"`,
                `Add stage "${effect.stageId}" to quest "${effect.questId}" or update the effect`
            );
        }
    } else if (
        effect.type === 'addJournalEntry' &&
        hasValue(effect.entryId) &&
        !registry.journalEntries[effect.entryId]
    ) {
        missing(
            `effect "addJournalEntry" references non-existent journal entry "${effect.entryId}"`,
            `Create journal entry "${effect.entryId}" or update the effect`
        );
    } else if (
        effect.type === 'startDialogue' &&
        hasValue(effect.dialogueId) &&
        !registry.dialogues[effect.dialogueId]
    ) {
        missing(
            `effect "startDialogue" references non-existent dialogue "${effect.dialogueId}"`,
            `Create dialogue "${effect.dialogueId}" or update the effect`
        );
    } else if (
        effect.type === 'showInterlude' &&
        hasValue(effect.interludeId) &&
        !registry.interludes[effect.interludeId]
    ) {
        missing(
            `effect "showInterlude" references non-existent interlude "${effect.interludeId}"`,
            `Create interlude "${effect.interludeId}" or update the effect`
        );
    } else if (
        (effect.type === 'setCharacterLocation' ||
            effect.type === 'addToParty' ||
            effect.type === 'removeFromParty' ||
            effect.type === 'setRelationship' ||
            effect.type === 'addRelationship' ||
            effect.type === 'setCharacterStat' ||
            effect.type === 'addCharacterStat') &&
        hasValue(effect.characterId) &&
        !registry.characters[effect.characterId]
    ) {
        missing(
            `effect "${effect.type}" references non-existent character "${effect.characterId}"`,
            `Create character "${effect.characterId}" or update the effect`
        );
    } else if (
        effect.type === 'setCharacterLocation' &&
        hasValue(effect.locationId) &&
        !registry.locations[effect.locationId]
    ) {
        missing(
            `effect "setCharacterLocation" references non-existent location "${effect.locationId}"`,
            `Create location "${effect.locationId}" or update the effect`
        );
    }
}

/**
 * Validate a single dialogue.
 *
 * Checks:
 * - startNode exists
 * - No duplicate node IDs
 * - GOTO targets exist
 * - Conditions have required arguments
 * - Effects have required arguments
 */
function validateDialogue(dialogue: Dialogue, file: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeIds = new Set<string>();

    // Check for duplicate node IDs
    for (const node of dialogue.nodes) {
        if (nodeIds.has(node.id)) {
            errors.push({
                file,
                message: `Duplicate node ID "${node.id}"`,
                suggestion: 'Node IDs must be unique within a dialogue',
            });
        }
        nodeIds.add(node.id);
    }

    // Check startNode exists
    if (!nodeIds.has(dialogue.startNode)) {
        errors.push({
            file,
            message: `Start node "${dialogue.startNode}" not found`,
            suggestion: `Add a NODE ${dialogue.startNode} or fix the startNode reference`,
        });
    }

    // Validate each node
    for (const node of dialogue.nodes) {
        errors.push(...validateDialogueNode(node, nodeIds, file));
    }

    return errors;
}

/**
 * Validate a single dialogue node.
 */
function validateDialogueNode(
    node: DialogueNode,
    validNodeIds: Set<string>,
    file: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate node.next
    if (node.next && !validNodeIds.has(node.next)) {
        errors.push({
            file,
            message: `Node "${node.id}" GOTO "${node.next}" points to non-existent node`,
            suggestion: `Add NODE ${node.next} or fix the GOTO target`,
        });
    }

    // Validate IF branches
    if (node.conditionalBranches) {
        for (const branch of node.conditionalBranches) {
            if (branch.next && !validNodeIds.has(branch.next)) {
                errors.push({
                    file,
                    message: `Node "${node.id}" IF block GOTO "${branch.next}" points to non-existent node`,
                    suggestion: `Add NODE ${branch.next} or fix the GOTO target`,
                });
            }

            // Validate condition
            errors.push(...validateCondition(branch.condition, node.id, file));

            // Validate branch effects
            if (branch.effects) {
                for (const effect of branch.effects) {
                    errors.push(...validateEffect(effect, node.id, file));
                }
            }
        }
    }

    // Validate choice targets
    for (const choice of node.choices) {
        const endsDialogue = choice.effects?.some(
            (e: any) =>
                e.type === 'endDialogue' ||
                e.type === 'goToLocation' ||
                e.type === 'startDialogue'
        );
        if (!endsDialogue && choice.next && !validNodeIds.has(choice.next)) {
            errors.push({
                file,
                message: `Node "${node.id}" choice "${choice.id}" GOTO "${choice.next}" points to non-existent node`,
                suggestion: `Add NODE ${choice.next} or fix the GOTO target`,
            });
        }

        // Validate choice conditions
        if (choice.conditions) {
            for (const condition of choice.conditions) {
                errors.push(...validateCondition(condition, node.id, file));
            }
        }

        // Validate choice effects
        if (choice.effects) {
            for (const effect of choice.effects) {
                errors.push(...validateEffect(effect, node.id, file));
            }
        }
    }

    // Validate node conditions
    if (node.conditions) {
        for (const condition of node.conditions) {
            errors.push(...validateCondition(condition, node.id, file));
        }
    }

    // Validate node effects
    if (node.effects) {
        for (const effect of node.effects) {
            errors.push(...validateEffect(effect, node.id, file));
        }
    }

    return errors;
}

// Required field mappings for conditions
const CONDITION_FIELDS: Record<string, string[]> = {
    hasFlag: ['flag'],
    notFlag: ['flag'],
    hasItem: ['itemId'],
    variableEquals: ['variable', 'value'],
    variableGreaterThan: ['variable', 'value'],
    variableLessThan: ['variable', 'value'],
    questAtStage: ['questId', 'stageId'],
    atLocation: ['locationId'],
    characterAt: ['characterId', 'locationId'],
    characterInParty: ['characterId'],
    relationshipAbove: ['characterId', 'value'],
    relationshipBelow: ['characterId', 'value'],
    itemAt: ['itemId', 'locationId'],
    roll: ['min', 'max', 'threshold'],
};

// Required field mappings for effects
const EFFECT_FIELDS: Record<string, string[]> = {
    setFlag: ['flag'],
    clearFlag: ['flag'],
    setVariable: ['variable', 'value'],
    addVariable: ['variable', 'value'],
    addItem: ['itemId'],
    removeItem: ['itemId'],
    moveItem: ['itemId', 'locationId'],
    goToLocation: ['locationId'],
    advanceTime: ['hours'],
    setQuestStage: ['questId', 'stageId'],
    addJournalEntry: ['entryId'],
    startDialogue: ['dialogueId'],
    endDialogue: [],
    setCharacterLocation: ['characterId', 'locationId'],
    addToParty: ['characterId'],
    removeFromParty: ['characterId'],
    setRelationship: ['characterId', 'value'],
    addRelationship: ['characterId', 'value'],
    setCharacterStat: ['characterId', 'stat', 'value'],
    addCharacterStat: ['characterId', 'stat', 'value'],
    setMapEnabled: ['enabled'],
    playMusic: [],
    playSound: ['sound'],
    notify: ['message'],
    playVideo: ['file'],
    showInterlude: ['interludeId'],
    roll: ['variable', 'min', 'max'],
};

function validateMaps(
    registry: ContentRegistry,
    fileMap: Map<string, string>
): ValidationError[] {
    const errors: ValidationError[] = [];
    const mapByLocation = new Map<string, string>();

    for (const map of Object.values(registry.maps)) {
        for (const marker of map.locations) {
            const location = registry.locations[marker.id];
            if (!location) {
                errors.push({
                    file: fileMap.get(map.id) || `map:${map.id}`,
                    message: `Map "${map.id}" references non-existent location "${marker.id}"`,
                    suggestion: `Create location "${marker.id}" or remove it from the map`,
                });
                continue;
            }

            const existingMapId = mapByLocation.get(marker.id);
            if (existingMapId === map.id) {
                errors.push({
                    file: fileMap.get(map.id) || `map:${map.id}`,
                    message: `Map "${map.id}" includes location "${marker.id}" more than once`,
                    suggestion: `Remove the duplicate marker for "${marker.id}"`,
                });
            } else if (existingMapId) {
                errors.push({
                    file: fileMap.get(map.id) || `map:${map.id}`,
                    message: `Location "${marker.id}" appears on multiple maps: ${existingMapId}, ${map.id}`,
                    suggestion: `Keep each location on one map so the engine can choose which map to show`,
                });
            } else {
                mapByLocation.set(marker.id, map.id);
            }
        }
    }

    return errors;
}

/**
 * Validate a condition has required arguments.
 */
function validateCondition(
    condition: any,
    nodeId: string,
    file: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!condition.type) {
        errors.push({
            file,
            message: `Node "${nodeId}" has condition with missing type`,
        });
        return errors;
    }

    // Special case: timeIs requires startHour and endHour
    if (condition.type === 'timeIs') {
        if (condition.startHour === undefined || condition.endHour === undefined) {
            errors.push({
                file,
                message: `Node "${nodeId}" condition "timeIs" missing required "startHour" or "endHour" argument`,
            });
        }
        return errors;
    }

    // Check required fields for this condition type
    const requiredFields = CONDITION_FIELDS[condition.type];
    if (!requiredFields) {
        // Unknown condition type - no required fields to check here
        return errors;
    }

    for (const field of requiredFields) {
        if (
            condition[field] === undefined ||
            condition[field] === null ||
            condition[field] === ''
        ) {
            errors.push({
                file,
                message: `Node "${nodeId}" condition "${condition.type}" missing required "${field}" argument`,
            });
        }
    }

    return errors;
}

/**
 * Validate an effect has required arguments.
 */
function validateEffect(
    effect: any,
    nodeId: string,
    file: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!effect.type) {
        errors.push({
            file,
            message: `Node "${nodeId}" has effect with missing type`,
        });
        return errors;
    }

    // Check required fields for this effect type
    const requiredFields = EFFECT_FIELDS[effect.type];
    if (!requiredFields) {
        // Unknown effect type - no required fields to check here
        return errors;
    }

    for (const field of requiredFields) {
        if (
            effect[field] === undefined ||
            effect[field] === null ||
            effect[field] === ''
        ) {
            errors.push({
                file,
                message: `Node "${nodeId}" effect "${effect.type}" missing required "${field}" argument`,
            });
        }
    }

    return errors;
}

/**
 * Validate localization keys exist in locale files.
 */
function validateLocalizationKeys(
    registry: ContentRegistry,
    fileMap: Map<string, string>
): ValidationError[] {
    const errors: ValidationError[] = [];
    const allKeys = new Set<string>();

    // Collect all keys from all locales
    for (const locale of Object.values(registry.locales)) {
        for (const key of Object.keys(locale)) {
            allKeys.add(key);
        }
    }

    // Helper to check if a string is a localization key
    const isLocalizationKey = (str: string): boolean => {
        return str.startsWith('@');
    };

    // Helper to validate a localization key
    const checkKey = (key: string, entityId: string, entityType: string) => {
        const cleanKey = key.slice(1); // Remove @
        if (!allKeys.has(cleanKey)) {
            const file = fileMap.get(entityId) || `${entityType}:${entityId}`;
            errors.push({
                file,
                message: `Localization key "${key}" not found in any locale file`,
                suggestion: `Add "${cleanKey}: ..." to your locale files`,
            });
        }
    };

    // Check locations
    for (const location of Object.values(registry.locations)) {
        if (isLocalizationKey(location.name)) {
            checkKey(location.name, location.id, 'location');
        }
        if (isLocalizationKey(location.description)) {
            checkKey(location.description, location.id, 'location');
        }
    }

    // Check characters
    for (const character of Object.values(registry.characters)) {
        if (isLocalizationKey(character.name)) {
            checkKey(character.name, character.id, 'character');
        }
        if (isLocalizationKey(character.biography)) {
            checkKey(character.biography, character.id, 'character');
        }
    }

    // Check items
    for (const item of Object.values(registry.items)) {
        if (isLocalizationKey(item.name)) {
            checkKey(item.name, item.id, 'item');
        }
        if (isLocalizationKey(item.description)) {
            checkKey(item.description, item.id, 'item');
        }
    }

    // Check quests
    for (const quest of Object.values(registry.quests)) {
        if (isLocalizationKey(quest.name)) {
            checkKey(quest.name, quest.id, 'quest');
        }
        if (isLocalizationKey(quest.description)) {
            checkKey(quest.description, quest.id, 'quest');
        }
        for (const stage of quest.stages) {
            if (isLocalizationKey(stage.description)) {
                checkKey(stage.description, quest.id, 'quest');
            }
        }
    }

    // Check journal entries
    for (const entry of Object.values(registry.journalEntries)) {
        if (isLocalizationKey(entry.title)) {
            checkKey(entry.title, entry.id, 'journal');
        }
        if (isLocalizationKey(entry.text)) {
            checkKey(entry.text, entry.id, 'journal');
        }
    }

    // Check dialogues
    for (const dialogue of Object.values(registry.dialogues)) {
        for (const node of dialogue.nodes) {
            if (isLocalizationKey(node.text)) {
                checkKey(node.text, dialogue.id, 'dialogue');
            }
            for (const choice of node.choices) {
                if (isLocalizationKey(choice.text)) {
                    checkKey(choice.text, dialogue.id, 'dialogue');
                }
            }
        }
    }

    // Check interludes
    for (const interlude of Object.values(registry.interludes)) {
        if (isLocalizationKey(interlude.text)) {
            checkKey(interlude.text, interlude.id, 'interlude');
        }
    }

    return errors;
}

/**
 * Print validation errors to console.
 */
export function printValidationErrors(errors: ValidationError[]): void {
    if (errors.length === 0) {
        console.log(crayon.green('✓ No validation errors'));
        return;
    }

    console.log(
        crayon.red(
            `\n✗ Found ${errors.length} validation error${errors.length === 1 ? '' : 's'}:\n`
        )
    );

    for (const error of errors) {
        console.log(
            crayon.bold(error.file) + (error.line ? `:${error.line}` : '')
        );
        console.log('  ' + crayon.red(error.message));
        if (error.suggestion) {
            console.log('  ' + crayon.dim(error.suggestion));
        }
        console.log();
    }
}
