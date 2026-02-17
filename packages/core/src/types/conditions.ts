/**
 * Condition type definitions for the Doodle Engine.
 * Conditions are tests against game state that return true or false.
 * All conditions use a discriminated union pattern for extensibility.
 */

/**
 * Check if a flag is set to true.
 * Example: hasFlag metBartender
 */
export interface HasFlagCondition {
  type: 'hasFlag'
  /** Flag key to check */
  flag: string
}

/**
 * Check if a flag is not set to true.
 * Example: notFlag doorLocked
 */
export interface NotFlagCondition {
  type: 'notFlag'
  /** Flag key to check */
  flag: string
}

/**
 * Check if an item is in the player's inventory.
 * Example: hasItem rusty_key
 */
export interface HasItemCondition {
  type: 'hasItem'
  /** Item ID to check for */
  itemId: string
}

/**
 * Check if a variable equals a specific value.
 * Example: variableEquals gold 100
 */
export interface VariableEqualsCondition {
  type: 'variableEquals'
  /** Variable key to check */
  variable: string
  /** Value to compare against */
  value: number | string
}

/**
 * Check if a variable is greater than a value.
 * Example: variableGreaterThan gold 10
 */
export interface VariableGreaterThanCondition {
  type: 'variableGreaterThan'
  /** Variable key to check */
  variable: string
  /** Value to compare against */
  value: number
}

/**
 * Check if a variable is less than a value.
 * Example: variableLessThan reputation 0
 */
export interface VariableLessThanCondition {
  type: 'variableLessThan'
  /** Variable key to check */
  variable: string
  /** Value to compare against */
  value: number
}

/**
 * Check if player is at a specific location.
 * Example: atLocation tavern
 */
export interface AtLocationCondition {
  type: 'atLocation'
  /** Location ID to check */
  locationId: string
}

/**
 * Check if a quest is at a specific stage.
 * Example: questAtStage odd_jobs started
 */
export interface QuestAtStageCondition {
  type: 'questAtStage'
  /** Quest ID to check */
  questId: string
  /** Stage ID to check for */
  stageId: string
}

/**
 * Check if a character is at a specific location.
 * Example: characterAt merchant market
 */
export interface CharacterAtCondition {
  type: 'characterAt'
  /** Character ID to check */
  characterId: string
  /** Location ID to check */
  locationId: string
}

/**
 * Check if a character is in the player's party.
 * Example: characterInParty jaheira
 */
export interface CharacterInPartyCondition {
  type: 'characterInParty'
  /** Character ID to check */
  characterId: string
}

/**
 * Check if relationship with a character is above a value.
 * Example: relationshipAbove bartender 5
 */
export interface RelationshipAboveCondition {
  type: 'relationshipAbove'
  /** Character ID to check */
  characterId: string
  /** Minimum relationship value (exclusive) */
  value: number
}

/**
 * Check if relationship with a character is below a value.
 * Example: relationshipBelow bartender 0
 */
export interface RelationshipBelowCondition {
  type: 'relationshipBelow'
  /** Character ID to check */
  characterId: string
  /** Maximum relationship value (exclusive) */
  value: number
}

/**
 * Check if current time is within a range (24-hour format).
 * Example: timeIs 20 6 (8 PM to 6 AM)
 */
export interface TimeIsCondition {
  type: 'timeIs'
  /** Start hour (0-23, inclusive) */
  startHour: number
  /** End hour (0-23, exclusive) */
  endHour: number
}

/**
 * Check if an item is at a specific location.
 * Example: itemAt sword armory
 */
export interface ItemAtCondition {
  type: 'itemAt'
  /** Item ID to check */
  itemId: string
  /** Location ID to check */
  locationId: string
}

/**
 * Roll a random integer and check if it meets a threshold.
 * Example: roll 1 20 15  (roll 1-20, pass if >= 15)
 *
 * Used for silent pass/fail checks without storing the result.
 */
export interface RollCondition {
  type: 'roll'
  /** Minimum value (inclusive) */
  min: number
  /** Maximum value (inclusive) */
  max: number
  /** Minimum result needed to pass (inclusive) */
  threshold: number
}

/**
 * Union of all condition types.
 * This discriminated union allows authors to extend with custom conditions.
 */
export type Condition =
  | HasFlagCondition
  | NotFlagCondition
  | HasItemCondition
  | VariableEqualsCondition
  | VariableGreaterThanCondition
  | VariableLessThanCondition
  | AtLocationCondition
  | QuestAtStageCondition
  | CharacterAtCondition
  | CharacterInPartyCondition
  | RelationshipAboveCondition
  | RelationshipBelowCondition
  | TimeIsCondition
  | ItemAtCondition
  | RollCondition
