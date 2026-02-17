/**
 * Effect processing system for the Doodle Engine.
 *
 * Effects are functions that mutate game state in response to player actions.
 * They are executed when:
 * - A dialogue node is reached
 * - A player selects a dialogue choice
 * - The engine processes narrative events
 *
 * All effects follow an immutable pattern - they return a new GameState
 * rather than mutating the existing one.
 */

import type { Effect } from '../types/effects'
import type { GameState } from '../types/state'

/**
 * Apply a single effect to the game state.
 *
 * @param effect - The effect to apply
 * @param state - Current game state
 * @returns New game state with the effect applied
 *
 * @example
 * ```ts
 * const effect: Effect = { type: 'setFlag', flag: 'metBartender' }
 * const newState = applyEffect(effect, state)
 * ```
 */
export function applyEffect(effect: Effect, state: GameState): GameState {
  switch (effect.type) {
    case 'setFlag':
      return applySetFlag(effect.flag, state)

    case 'clearFlag':
      return applyClearFlag(effect.flag, state)

    case 'setVariable':
      return applySetVariable(effect.variable, effect.value, state)

    case 'addVariable':
      return applyAddVariable(effect.variable, effect.value, state)

    case 'addItem':
      return applyAddItem(effect.itemId, state)

    case 'removeItem':
      return applyRemoveItem(effect.itemId, state)

    case 'moveItem':
      return applyMoveItem(effect.itemId, effect.locationId, state)

    case 'goToLocation':
      return applyGoToLocation(effect.locationId, state)

    case 'advanceTime':
      return applyAdvanceTime(effect.hours, state)

    case 'setQuestStage':
      return applySetQuestStage(effect.questId, effect.stageId, state)

    case 'addJournalEntry':
      return applyAddJournalEntry(effect.entryId, state)

    case 'startDialogue':
      return applyStartDialogue(effect.dialogueId, state)

    case 'endDialogue':
      return applyEndDialogue(state)

    case 'setCharacterLocation':
      return applySetCharacterLocation(effect.characterId, effect.locationId, state)

    case 'addToParty':
      return applyAddToParty(effect.characterId, state)

    case 'removeFromParty':
      return applyRemoveFromParty(effect.characterId, state)

    case 'setRelationship':
      return applySetRelationship(effect.characterId, effect.value, state)

    case 'addRelationship':
      return applyAddRelationship(effect.characterId, effect.value, state)

    case 'setCharacterStat':
      return applySetCharacterStat(effect.characterId, effect.stat, effect.value, state)

    case 'addCharacterStat':
      return applyAddCharacterStat(effect.characterId, effect.stat, effect.value, state)

    case 'setMapEnabled':
      return applySetMapEnabled(effect.enabled, state)

    case 'playMusic':
      // Music is handled by snapshot builder (reads from location.music)
      // This effect is for one-off music changes (not implemented yet)
      return state

    case 'playSound':
      return applyPlaySound(effect.sound, state)

    case 'notify':
      return applyNotify(effect.message, state)

    case 'playVideo':
      return applyPlayVideo(effect.file, state)

    case 'showInterlude':
      return applyShowInterlude(effect.interludeId, state)

    default:
      // TypeScript exhaustiveness check - this should never be reached
      const _exhaustive: never = effect
      return state
  }
}

/**
 * Apply multiple effects in sequence.
 * Effects are processed in order, with each effect receiving the state
 * produced by the previous effect.
 *
 * @param effects - Array of effects to apply
 * @param state - Current game state
 * @returns New game state with all effects applied
 */
export function applyEffects(effects: Effect[], state: GameState): GameState {
  return effects.reduce((currentState, effect) => applyEffect(effect, currentState), state)
}

// =============================================================================
// Individual Effect Processors
// =============================================================================

/**
 * Set a flag to true.
 *
 * Example: SET flag metBartender
 */
function applySetFlag(flag: string, state: GameState): GameState {
  return {
    ...state,
    flags: {
      ...state.flags,
      [flag]: true,
    },
  }
}

/**
 * Set a flag to false.
 *
 * Example: CLEAR flag doorLocked
 */
function applyClearFlag(flag: string, state: GameState): GameState {
  return {
    ...state,
    flags: {
      ...state.flags,
      [flag]: false,
    },
  }
}

/**
 * Set a variable to a specific value.
 *
 * Example: SET variable gold 100
 */
function applySetVariable(
  variable: string,
  value: number | string,
  state: GameState
): GameState {
  return {
    ...state,
    variables: {
      ...state.variables,
      [variable]: value,
    },
  }
}

/**
 * Add to (or subtract from) a numeric variable.
 * If the variable doesn't exist, initializes it to the value.
 * If the variable is a string, this effect does nothing.
 *
 * Example: ADD variable gold -50
 */
function applyAddVariable(variable: string, value: number, state: GameState): GameState {
  const currentValue = state.variables[variable]

  // Only add if current value is a number or doesn't exist
  const newValue =
    typeof currentValue === 'number' ? currentValue + value : value

  return {
    ...state,
    variables: {
      ...state.variables,
      [variable]: newValue,
    },
  }
}

/**
 * Add an item to the player's inventory.
 * Also updates itemLocations to track the item is in inventory.
 *
 * Example: ADD item rusty_key
 */
function applyAddItem(itemId: string, state: GameState): GameState {
  // Don't add if already in inventory
  if (state.inventory.includes(itemId)) {
    return state
  }

  return {
    ...state,
    inventory: [...state.inventory, itemId],
    itemLocations: {
      ...state.itemLocations,
      [itemId]: 'inventory',
    },
  }
}

/**
 * Remove an item from the player's inventory.
 * The item's location in itemLocations is preserved (it goes to its last known location).
 *
 * Example: REMOVE item rusty_key
 */
function applyRemoveItem(itemId: string, state: GameState): GameState {
  return {
    ...state,
    inventory: state.inventory.filter(id => id !== itemId),
    // Note: itemLocation is NOT updated here - the item stays at "inventory"
    // or wherever it was. Use moveItem to relocate it.
  }
}

/**
 * Move an item to a specific location.
 * Removes it from inventory if it was there.
 *
 * Example: MOVE item rusty_key cellar
 */
function applyMoveItem(itemId: string, locationId: string, state: GameState): GameState {
  return {
    ...state,
    inventory: state.inventory.filter(id => id !== itemId),
    itemLocations: {
      ...state.itemLocations,
      [itemId]: locationId,
    },
  }
}

/**
 * Change the player's current location.
 * Note: This does NOT advance time or check for triggered dialogues.
 * Those are handled by the engine's travelTo method.
 *
 * Example: GOTO location tavern
 */
function applyGoToLocation(locationId: string, state: GameState): GameState {
  return {
    ...state,
    currentLocation: locationId,
  }
}

/**
 * Advance the game clock by a number of hours.
 * Handles day rollover when hours exceed 24.
 *
 * Example: ADVANCE time 2
 */
function applyAdvanceTime(hours: number, state: GameState): GameState {
  const newHour = state.currentTime.hour + hours
  const daysToAdd = Math.floor(newHour / 24)
  const finalHour = newHour % 24

  return {
    ...state,
    currentTime: {
      day: state.currentTime.day + daysToAdd,
      hour: finalHour,
    },
  }
}

/**
 * Set a quest to a specific stage.
 *
 * Example: SET questStage odd_jobs started
 */
function applySetQuestStage(
  questId: string,
  stageId: string,
  state: GameState
): GameState {
  return {
    ...state,
    questProgress: {
      ...state.questProgress,
      [questId]: stageId,
    },
  }
}

/**
 * Unlock a journal entry for the player.
 * If already unlocked, does nothing.
 *
 * Example: ADD journalEntry tavern_discovery
 */
function applyAddJournalEntry(entryId: string, state: GameState): GameState {
  // Don't add if already unlocked
  if (state.unlockedJournalEntries.includes(entryId)) {
    return state
  }

  return {
    ...state,
    unlockedJournalEntries: [...state.unlockedJournalEntries, entryId],
  }
}

/**
 * Start a dialogue.
 * Note: The startNode is determined by looking up the dialogue in the content registry.
 * This effect only sets the dialogueId - the engine resolves the startNode.
 *
 * Example: START dialogue merchant_intro
 */
function applyStartDialogue(dialogueId: string, state: GameState): GameState {
  return {
    ...state,
    dialogueState: {
      dialogueId,
      nodeId: '', // Will be set by engine when it looks up the dialogue
    },
  }
}

/**
 * End the current dialogue.
 *
 * Example: END dialogue
 */
function applyEndDialogue(state: GameState): GameState {
  return {
    ...state,
    dialogueState: null,
  }
}

/**
 * Move a character to a specific location.
 *
 * Example: SET characterLocation merchant tavern
 */
function applySetCharacterLocation(
  characterId: string,
  locationId: string,
  state: GameState
): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        location: locationId,
      },
    },
  }
}

/**
 * Add a character to the player's party.
 *
 * Example: ADD toParty jaheira
 */
function applyAddToParty(characterId: string, state: GameState): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        inParty: true,
      },
    },
  }
}

/**
 * Remove a character from the player's party.
 *
 * Example: REMOVE fromParty jaheira
 */
function applyRemoveFromParty(characterId: string, state: GameState): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        inParty: false,
      },
    },
  }
}

/**
 * Set relationship value with a character.
 *
 * Example: SET relationship bartender 5
 */
function applySetRelationship(
  characterId: string,
  value: number,
  state: GameState
): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        relationship: value,
      },
    },
  }
}

/**
 * Add to (or subtract from) relationship with a character.
 *
 * Example: ADD relationship bartender 1
 */
function applyAddRelationship(
  characterId: string,
  value: number,
  state: GameState
): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        relationship: characterState.relationship + value,
      },
    },
  }
}

/**
 * Set a stat value on a character.
 *
 * Example: SET characterStat jaheira level 5
 */
function applySetCharacterStat(
  characterId: string,
  stat: string,
  value: unknown,
  state: GameState
): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        stats: {
          ...characterState.stats,
          [stat]: value,
        },
      },
    },
  }
}

/**
 * Add to (or subtract from) a character stat.
 * Only works if the current stat value is a number.
 *
 * Example: ADD characterStat jaheira health -10
 */
function applyAddCharacterStat(
  characterId: string,
  stat: string,
  value: number,
  state: GameState
): GameState {
  const characterState = state.characterState[characterId]
  if (!characterState) {
    return state
  }

  const currentValue = characterState.stats[stat]
  const newValue =
    typeof currentValue === 'number' ? currentValue + value : value

  return {
    ...state,
    characterState: {
      ...state.characterState,
      [characterId]: {
        ...characterState,
        stats: {
          ...characterState.stats,
          [stat]: newValue,
        },
      },
    },
  }
}

/**
 * Enable or disable the map.
 * When disabled, the player cannot open the map to travel.
 *
 * Example: SET mapEnabled false
 */
function applySetMapEnabled(enabled: boolean, state: GameState): GameState {
  return {
    ...state,
    mapEnabled: enabled,
  }
}

/**
 * Add a notification for the player.
 * Notifications are shown in the UI and then cleared.
 *
 * Example: NOTIFY @quest.odd_jobs.started
 */
function applyNotify(message: string, state: GameState): GameState {
  return {
    ...state,
    notifications: [...state.notifications, message],
  }
}

/**
 * Queue a sound effect to play.
 * Sound effects are played once and then cleared from the queue.
 *
 * Example: SOUND door_slam.ogg
 */
function applyPlaySound(sound: string, state: GameState): GameState {
  return {
    ...state,
    pendingSounds: [...state.pendingSounds, sound],
  }
}

/**
 * Queue a video to play fullscreen.
 * The video is played once and then cleared from the state.
 *
 * Example: VIDEO intro.mp4
 */
function applyPlayVideo(file: string, state: GameState): GameState {
  return {
    ...state,
    pendingVideo: file,
  }
}

/**
 * Queue a narrative interlude to show.
 * The interlude is shown once and then cleared from the state.
 *
 * Example: INTERLUDE chapter_one
 */
function applyShowInterlude(interludeId: string, state: GameState): GameState {
  return {
    ...state,
    pendingInterlude: interludeId,
  }
}
