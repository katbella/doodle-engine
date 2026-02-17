/**
 * Content entity type definitions for the Doodle Engine.
 * These represent static content defined by authors in YAML and DSL files.
 */

import type { Condition } from './conditions'
import type { Effect } from './effects'

/**
 * A location in the game world where the player can be.
 */
export interface Location {
  /** Unique identifier for this location */
  id: string
  /** Display name (supports @localization keys) */
  name: string
  /** Text shown when player is at this location */
  description: string
  /** Image shown when player is at this location */
  banner: string
  /** Background music track */
  music: string
  /** Ambient sound loop */
  ambient: string
}

/**
 * A character in the game world.
 */
export interface Character {
  /** Unique identifier for this character */
  id: string
  /** Display name (supports @localization keys) */
  name: string
  /** Character background text */
  biography: string
  /** Character portrait image */
  portrait: string
  /** Starting location ID */
  location: string
  /** Dialogue ID when player talks to this character */
  dialogue: string
  /** Extensible stats object - engine stores but doesn't interpret */
  stats: Record<string, unknown>
}

/**
 * An item that can be picked up, carried, or interacted with.
 */
export interface Item {
  /** Unique identifier for this item */
  id: string
  /** Display name (supports @localization keys) */
  name: string
  /** Item description text */
  description: string
  /** Small image for inventory display */
  icon: string
  /** Large image for detailed view */
  image: string
  /** Starting location (location ID, "inventory", or character ID) */
  location: string
  /** Extensible stats object - engine stores but doesn't interpret */
  stats: Record<string, unknown>
}

/**
 * A location marker on a map with coordinates.
 */
export interface MapLocation {
  /** Location ID */
  id: string
  /** X coordinate on map image */
  x: number
  /** Y coordinate on map image */
  y: number
}

/**
 * A map showing multiple locations the player can travel between.
 */
export interface Map {
  /** Unique identifier for this map */
  id: string
  /** Display name (supports @localization keys) */
  name: string
  /** Map background image */
  image: string
  /** Units to travel time conversion factor */
  scale: number
  /** Locations shown on this map with their coordinates */
  locations: MapLocation[]
}

/**
 * A dialogue tree containing conversation nodes.
 */
export interface Dialogue {
  /** Unique identifier for this dialogue */
  id: string
  /** Location ID where this auto-triggers on enter (optional) */
  triggerLocation?: string
  /** Conditions that must pass for auto-trigger (optional) */
  conditions?: Condition[]
  /** ID of the node that begins the conversation */
  startNode: string
  /** All dialogue nodes in this conversation */
  nodes: DialogueNode[]
}

/**
 * A single node in a dialogue tree.
 */
export interface DialogueNode {
  /** Unique identifier for this node */
  id: string
  /** Character ID speaking, or null for narration */
  speaker: string | null
  /** What's said (supports @localization keys) */
  text: string
  /** Optional audio file for this line */
  voice?: string
  /** Optional portrait override (expression variant) */
  portrait?: string
  /** Conditions that must be true to show this node */
  conditions?: Condition[]
  /** Player choices (if empty, auto-advance to next) */
  choices: Choice[]
  /** Effects that run when this node is reached */
  effects?: Effect[]
  /** Conditional branching (IF blocks) - evaluated in order, first passing wins */
  conditionalNext?: Array<{ condition: Condition; next: string }>
  /** Default next node if no choices and no conditionalNext passes */
  next?: string
}

/**
 * A player choice in a dialogue node.
 */
export interface Choice {
  /** Unique identifier for this choice */
  id: string
  /** What the player sees (supports @localization keys) */
  text: string
  /** Conditions that must be true to show this choice */
  conditions?: Condition[]
  /** Effects that run when this choice is selected */
  effects?: Effect[]
  /** Which node to go to when picked */
  next: string
}

/**
 * A quest with multiple stages.
 */
export interface Quest {
  /** Unique identifier for this quest */
  id: string
  /** Display name (supports @localization keys) */
  name: string
  /** Quest description text */
  description: string
  /** Quest stages (including started, complete, failed, etc.) */
  stages: QuestStage[]
}

/**
 * A single stage in a quest progression.
 */
export interface QuestStage {
  /** Unique identifier for this stage */
  id: string
  /** Text shown in journal for this stage */
  description: string
}

/**
 * A journal entry for lore, people, or places.
 */
export interface JournalEntry {
  /** Unique identifier for this entry */
  id: string
  /** Display title (supports @localization keys) */
  title: string
  /** Entry content text */
  text: string
  /** Category for grouping (e.g., "lore", "people", "places") */
  category: string
}

/**
 * Game configuration that defines starting conditions.
 */
export interface GameConfig {
  /** Starting location ID */
  startLocation: string
  /** Starting time */
  startTime: {
    /** Starting day */
    day: number
    /** Starting hour (0-23) */
    hour: number
  }
  /** Starting flags */
  startFlags: Record<string, boolean>
  /** Starting variables */
  startVariables: Record<string, number | string>
  /** Starting inventory (array of item IDs) */
  startInventory: string[]
}
