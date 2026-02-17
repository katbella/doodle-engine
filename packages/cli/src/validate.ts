/**
 * Content validation for Doodle Engine.
 *
 * Validates dialogues, content references, and localization keys.
 */

import { crayon } from 'crayon.js'
import type { ContentRegistry } from '@doodle-engine/core'
import type { Dialogue, DialogueNode } from '@doodle-engine/core'

export interface ValidationError {
  file: string
  line?: number
  message: string
  suggestion?: string
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
  fileMap: Map<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate dialogues
  for (const dialogue of Object.values(registry.dialogues)) {
    const file = fileMap.get(dialogue.id) || `dialogue:${dialogue.id}`
    errors.push(...validateDialogue(dialogue, file))
  }

  // Validate character dialogue references
  for (const character of Object.values(registry.characters)) {
    if (character.dialogue && !registry.dialogues[character.dialogue]) {
      const file = fileMap.get(character.id) || `character:${character.id}`
      errors.push({
        file,
        message: `Character "${character.id}" references non-existent dialogue "${character.dialogue}"`,
        suggestion: `Create dialogue "${character.dialogue}" or fix the reference`,
      })
    }
  }

  // Validate localization keys
  errors.push(...validateLocalizationKeys(registry, fileMap))

  return errors
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
  const errors: ValidationError[] = []
  const nodeIds = new Set<string>()

  // Check for duplicate node IDs
  for (const node of dialogue.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        file,
        message: `Duplicate node ID "${node.id}"`,
        suggestion: 'Node IDs must be unique within a dialogue',
      })
    }
    nodeIds.add(node.id)
  }

  // Check startNode exists
  if (!nodeIds.has(dialogue.startNode)) {
    errors.push({
      file,
      message: `Start node "${dialogue.startNode}" not found`,
      suggestion: `Add a NODE ${dialogue.startNode} or fix the startNode reference`,
    })
  }

  // Validate each node
  for (const node of dialogue.nodes) {
    errors.push(...validateDialogueNode(node, nodeIds, file))
  }

  return errors
}

/**
 * Validate a single dialogue node.
 */
function validateDialogueNode(
  node: DialogueNode,
  validNodeIds: Set<string>,
  file: string
): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate node.next
  if (node.next && !validNodeIds.has(node.next)) {
    errors.push({
      file,
      message: `Node "${node.id}" GOTO "${node.next}" points to non-existent node`,
      suggestion: `Add NODE ${node.next} or fix the GOTO target`,
    })
  }

  // Validate conditionalNext
  if (node.conditionalNext) {
    for (const branch of node.conditionalNext) {
      if (!validNodeIds.has(branch.next)) {
        errors.push({
          file,
          message: `Node "${node.id}" IF block GOTO "${branch.next}" points to non-existent node`,
          suggestion: `Add NODE ${branch.next} or fix the GOTO target`,
        })
      }

      // Validate condition
      errors.push(...validateCondition(branch.condition, node.id, file))
    }
  }

  // Validate choice targets
  for (const choice of node.choices) {
    if (!validNodeIds.has(choice.next)) {
      errors.push({
        file,
        message: `Node "${node.id}" choice "${choice.id}" GOTO "${choice.next}" points to non-existent node`,
        suggestion: `Add NODE ${choice.next} or fix the GOTO target`,
      })
    }

    // Validate choice conditions
    if (choice.conditions) {
      for (const condition of choice.conditions) {
        errors.push(...validateCondition(condition, node.id, file))
      }
    }

    // Validate choice effects
    if (choice.effects) {
      for (const effect of choice.effects) {
        errors.push(...validateEffect(effect, node.id, file))
      }
    }
  }

  // Validate node conditions
  if (node.conditions) {
    for (const condition of node.conditions) {
      errors.push(...validateCondition(condition, node.id, file))
    }
  }

  // Validate node effects
  if (node.effects) {
    for (const effect of node.effects) {
      errors.push(...validateEffect(effect, node.id, file))
    }
  }

  return errors
}

/**
 * Validate a condition has required arguments.
 */
function validateCondition(condition: any, nodeId: string, file: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!condition.type) {
    errors.push({
      file,
      message: `Node "${nodeId}" has condition with missing type`,
    })
    return errors
  }

  // Check type-specific required fields
  switch (condition.type) {
    case 'hasFlag':
    case 'notFlag':
      if (!condition.flag) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "${condition.type}" missing required "flag" argument`,
        })
      }
      break
    case 'hasItem':
    case 'notItem':
      if (!condition.item) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "${condition.type}" missing required "item" argument`,
        })
      }
      break
    case 'questAtStage':
      if (!condition.quest) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "questAtStage" missing required "quest" argument`,
        })
      }
      if (!condition.stage) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "questAtStage" missing required "stage" argument`,
        })
      }
      break
    case 'variableEquals':
    case 'variableGreaterThan':
    case 'variableLessThan':
      if (!condition.variable) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "${condition.type}" missing required "variable" argument`,
        })
      }
      if (condition.value === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" condition "${condition.type}" missing required "value" argument`,
        })
      }
      break
  }

  return errors
}

/**
 * Validate an effect has required arguments.
 */
function validateEffect(effect: any, nodeId: string, file: string): ValidationError[] {
  const errors: ValidationError[] = []

  if (!effect.type) {
    errors.push({
      file,
      message: `Node "${nodeId}" has effect with missing type`,
    })
    return errors
  }

  // Check type-specific required fields
  switch (effect.type) {
    case 'setFlag':
    case 'clearFlag':
      if (!effect.flag) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "flag" argument`,
        })
      }
      break
    case 'setVariable':
    case 'addVariable':
      if (!effect.variable) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "variable" argument`,
        })
      }
      if (effect.value === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "value" argument`,
        })
      }
      break
    case 'addItem':
    case 'removeItem':
      if (!effect.item) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "item" argument`,
        })
      }
      break
    case 'moveItem':
      if (!effect.item) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "moveItem" missing required "item" argument`,
        })
      }
      if (!effect.location) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "moveItem" missing required "location" argument`,
        })
      }
      break
    case 'setQuestStage':
      if (!effect.quest) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "setQuestStage" missing required "quest" argument`,
        })
      }
      if (!effect.stage) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "setQuestStage" missing required "stage" argument`,
        })
      }
      break
    case 'addJournalEntry':
      if (!effect.entry) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "addJournalEntry" missing required "entry" argument`,
        })
      }
      break
    case 'setCharacterLocation':
      if (!effect.character) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "setCharacterLocation" missing required "character" argument`,
        })
      }
      if (!effect.location) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "setCharacterLocation" missing required "location" argument`,
        })
      }
      break
    case 'addToParty':
    case 'removeFromParty':
      if (!effect.character) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "character" argument`,
        })
      }
      break
    case 'setRelationship':
    case 'addRelationship':
      if (!effect.character) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "character" argument`,
        })
      }
      if (effect.value === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "value" argument`,
        })
      }
      break
    case 'setCharacterStat':
    case 'addCharacterStat':
      if (!effect.character) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "character" argument`,
        })
      }
      if (!effect.stat) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "stat" argument`,
        })
      }
      if (effect.value === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "value" argument`,
        })
      }
      break
    case 'setMapEnabled':
      if (effect.enabled === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "setMapEnabled" missing required "enabled" argument`,
        })
      }
      break
    case 'advanceTime':
      if (effect.hours === undefined) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "advanceTime" missing required "hours" argument`,
        })
      }
      break
    case 'goToLocation':
      if (!effect.location) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "goToLocation" missing required "location" argument`,
        })
      }
      break
    case 'startDialogue':
      if (!effect.dialogue) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "startDialogue" missing required "dialogue" argument`,
        })
      }
      break
    case 'playMusic':
    case 'playSound':
      if (!effect.file) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "${effect.type}" missing required "file" argument`,
        })
      }
      break
    case 'playVideo':
      if (!effect.file) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "playVideo" missing required "file" argument`,
        })
      }
      break
    case 'notify':
      if (!effect.message) {
        errors.push({
          file,
          message: `Node "${nodeId}" effect "notify" missing required "message" argument`,
        })
      }
      break
  }

  return errors
}

/**
 * Validate localization keys exist in locale files.
 */
function validateLocalizationKeys(
  registry: ContentRegistry,
  fileMap: Map<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []
  const allKeys = new Set<string>()

  // Collect all keys from all locales
  for (const locale of Object.values(registry.locales)) {
    for (const key of Object.keys(locale)) {
      allKeys.add(key)
    }
  }

  // Helper to check if a string is a localization key
  const isLocalizationKey = (str: string): boolean => {
    return str.startsWith('@')
  }

  // Helper to validate a localization key
  const checkKey = (key: string, entityId: string, entityType: string) => {
    const cleanKey = key.slice(1) // Remove @
    if (!allKeys.has(cleanKey)) {
      const file = fileMap.get(entityId) || `${entityType}:${entityId}`
      errors.push({
        file,
        message: `Localization key "${key}" not found in any locale file`,
        suggestion: `Add "${cleanKey}: ..." to your locale files`,
      })
    }
  }

  // Check locations
  for (const location of Object.values(registry.locations)) {
    if (isLocalizationKey(location.name)) {
      checkKey(location.name, location.id, 'location')
    }
    if (isLocalizationKey(location.description)) {
      checkKey(location.description, location.id, 'location')
    }
  }

  // Check characters
  for (const character of Object.values(registry.characters)) {
    if (isLocalizationKey(character.name)) {
      checkKey(character.name, character.id, 'character')
    }
    if (isLocalizationKey(character.biography)) {
      checkKey(character.biography, character.id, 'character')
    }
  }

  // Check items
  for (const item of Object.values(registry.items)) {
    if (isLocalizationKey(item.name)) {
      checkKey(item.name, item.id, 'item')
    }
    if (isLocalizationKey(item.description)) {
      checkKey(item.description, item.id, 'item')
    }
  }

  // Check quests
  for (const quest of Object.values(registry.quests)) {
    if (isLocalizationKey(quest.name)) {
      checkKey(quest.name, quest.id, 'quest')
    }
    if (isLocalizationKey(quest.description)) {
      checkKey(quest.description, quest.id, 'quest')
    }
    for (const stage of quest.stages) {
      if (isLocalizationKey(stage.description)) {
        checkKey(stage.description, quest.id, 'quest')
      }
    }
  }

  // Check journal entries
  for (const entry of Object.values(registry.journalEntries)) {
    if (isLocalizationKey(entry.title)) {
      checkKey(entry.title, entry.id, 'journal')
    }
    if (isLocalizationKey(entry.text)) {
      checkKey(entry.text, entry.id, 'journal')
    }
  }

  // Check dialogues
  for (const dialogue of Object.values(registry.dialogues)) {
    for (const node of dialogue.nodes) {
      if (isLocalizationKey(node.text)) {
        checkKey(node.text, dialogue.id, 'dialogue')
      }
      for (const choice of node.choices) {
        if (isLocalizationKey(choice.text)) {
          checkKey(choice.text, dialogue.id, 'dialogue')
        }
      }
    }
  }

  return errors
}

/**
 * Print validation errors to console.
 */
export function printValidationErrors(errors: ValidationError[]): void {
  if (errors.length === 0) {
    console.log(crayon.green('✓ No validation errors'))
    return
  }

  console.log(crayon.red(`\n✗ Found ${errors.length} validation error${errors.length === 1 ? '' : 's'}:\n`))

  for (const error of errors) {
    console.log(crayon.bold(error.file) + (error.line ? `:${error.line}` : ''))
    console.log('  ' + crayon.red(error.message))
    if (error.suggestion) {
      console.log('  ' + crayon.dim(error.suggestion))
    }
    console.log()
  }
}
