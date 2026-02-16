/**
 * Condition evaluation system for the Doodle Engine.
 *
 * Conditions are pure functions that test game state and return true or false.
 * They are used throughout the engine to:
 * - Filter dialogue choices that should be visible
 * - Determine which dialogue nodes to show
 * - Decide if triggered dialogues should start
 *
 * All evaluators are pure functions with no side effects.
 */

import type { Condition } from '../types/conditions'
import type { GameState } from '../types/state'

/**
 * Evaluate a single condition against the current game state.
 *
 * @param condition - The condition to evaluate
 * @param state - Current game state
 * @returns true if the condition passes, false otherwise
 *
 * @example
 * ```ts
 * const condition: Condition = { type: 'hasFlag', flag: 'metBartender' }
 * const passes = evaluateCondition(condition, state) // true if flag is set
 * ```
 */
export function evaluateCondition(condition: Condition, state: GameState): boolean {
  switch (condition.type) {
    case 'hasFlag':
      return evaluateHasFlag(condition.flag, state)

    case 'notFlag':
      return evaluateNotFlag(condition.flag, state)

    case 'hasItem':
      return evaluateHasItem(condition.itemId, state)

    case 'variableEquals':
      return evaluateVariableEquals(condition.variable, condition.value, state)

    case 'variableGreaterThan':
      return evaluateVariableGreaterThan(condition.variable, condition.value, state)

    case 'variableLessThan':
      return evaluateVariableLessThan(condition.variable, condition.value, state)

    case 'atLocation':
      return evaluateAtLocation(condition.locationId, state)

    case 'questAtStage':
      return evaluateQuestAtStage(condition.questId, condition.stageId, state)

    case 'characterAt':
      return evaluateCharacterAt(condition.characterId, condition.locationId, state)

    case 'characterInParty':
      return evaluateCharacterInParty(condition.characterId, state)

    case 'relationshipAbove':
      return evaluateRelationshipAbove(condition.characterId, condition.value, state)

    case 'relationshipBelow':
      return evaluateRelationshipBelow(condition.characterId, condition.value, state)

    case 'timeIs':
      return evaluateTimeIs(condition.startHour, condition.endHour, state)

    case 'itemAt':
      return evaluateItemAt(condition.itemId, condition.locationId, state)

    default:
      // TypeScript exhaustiveness check - this should never be reached
      const _exhaustive: never = condition
      return false
  }
}

/**
 * Evaluate multiple conditions with AND logic.
 * All conditions must pass for this to return true.
 *
 * @param conditions - Array of conditions to evaluate
 * @param state - Current game state
 * @returns true if all conditions pass, false otherwise
 */
export function evaluateConditions(conditions: Condition[], state: GameState): boolean {
  return conditions.every(condition => evaluateCondition(condition, state))
}

// =============================================================================
// Individual Condition Evaluators
// =============================================================================

/**
 * Check if a flag is set to true.
 * Returns false if the flag doesn't exist.
 *
 * Example: hasFlag metBartender
 */
function evaluateHasFlag(flag: string, state: GameState): boolean {
  return state.flags[flag] === true
}

/**
 * Check if a flag is NOT set to true.
 * Returns true if the flag doesn't exist or is false.
 *
 * Example: notFlag doorLocked
 */
function evaluateNotFlag(flag: string, state: GameState): boolean {
  return state.flags[flag] !== true
}

/**
 * Check if an item is in the player's inventory.
 *
 * Example: hasItem rusty_key
 */
function evaluateHasItem(itemId: string, state: GameState): boolean {
  return state.inventory.includes(itemId)
}

/**
 * Check if a variable equals a specific value.
 * Returns false if the variable doesn't exist.
 *
 * Example: variableEquals gold 100
 */
function evaluateVariableEquals(
  variable: string,
  value: number | string,
  state: GameState
): boolean {
  return state.variables[variable] === value
}

/**
 * Check if a numeric variable is greater than a value.
 * Returns false if the variable doesn't exist or is not a number.
 *
 * Example: variableGreaterThan gold 10
 */
function evaluateVariableGreaterThan(
  variable: string,
  value: number,
  state: GameState
): boolean {
  const variableValue = state.variables[variable]
  return typeof variableValue === 'number' && variableValue > value
}

/**
 * Check if a numeric variable is less than a value.
 * Returns false if the variable doesn't exist or is not a number.
 *
 * Example: variableLessThan reputation 0
 */
function evaluateVariableLessThan(
  variable: string,
  value: number,
  state: GameState
): boolean {
  const variableValue = state.variables[variable]
  return typeof variableValue === 'number' && variableValue < value
}

/**
 * Check if the player is at a specific location.
 *
 * Example: atLocation tavern
 */
function evaluateAtLocation(locationId: string, state: GameState): boolean {
  return state.currentLocation === locationId
}

/**
 * Check if a quest is at a specific stage.
 * Returns false if the quest hasn't been started.
 *
 * Example: questAtStage odd_jobs started
 */
function evaluateQuestAtStage(
  questId: string,
  stageId: string,
  state: GameState
): boolean {
  return state.questProgress[questId] === stageId
}

/**
 * Check if a character is at a specific location.
 * Returns false if the character doesn't exist in characterState.
 *
 * Example: characterAt merchant market
 */
function evaluateCharacterAt(
  characterId: string,
  locationId: string,
  state: GameState
): boolean {
  const characterState = state.characterState[characterId]
  return characterState?.location === locationId
}

/**
 * Check if a character is in the player's party.
 * Returns false if the character doesn't exist in characterState.
 *
 * Example: characterInParty jaheira
 */
function evaluateCharacterInParty(characterId: string, state: GameState): boolean {
  const characterState = state.characterState[characterId]
  return characterState?.inParty === true
}

/**
 * Check if relationship with a character is above a value (exclusive).
 * Returns false if the character doesn't exist in characterState.
 *
 * Example: relationshipAbove bartender 5
 */
function evaluateRelationshipAbove(
  characterId: string,
  value: number,
  state: GameState
): boolean {
  const characterState = state.characterState[characterId]
  return characterState !== undefined && characterState.relationship > value
}

/**
 * Check if relationship with a character is below a value (exclusive).
 * Returns false if the character doesn't exist in characterState.
 *
 * Example: relationshipBelow bartender 0
 */
function evaluateRelationshipBelow(
  characterId: string,
  value: number,
  state: GameState
): boolean {
  const characterState = state.characterState[characterId]
  return characterState !== undefined && characterState.relationship < value
}

/**
 * Check if current time is within a range (24-hour format).
 * Handles ranges that wrap around midnight.
 *
 * Examples:
 * - timeIs 20 6   → 8 PM to 6 AM (night time)
 * - timeIs 9 17   → 9 AM to 5 PM (day time)
 *
 * @param startHour - Start hour (0-23, inclusive)
 * @param endHour - End hour (0-23, exclusive)
 */
function evaluateTimeIs(startHour: number, endHour: number, state: GameState): boolean {
  const currentHour = state.currentTime.hour

  // Handle normal range (e.g., 9 to 17)
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour
  }

  // Handle wrap-around range (e.g., 20 to 6)
  return currentHour >= startHour || currentHour < endHour
}

/**
 * Check if an item is at a specific location.
 * Returns false if the item doesn't exist in itemLocations.
 *
 * Example: itemAt sword armory
 */
function evaluateItemAt(itemId: string, locationId: string, state: GameState): boolean {
  return state.itemLocations[itemId] === locationId
}
