/**
 * Save data type definitions for the Doodle Engine.
 * Save files contain game state plus metadata.
 */

import type { GameState } from "./state";

/**
 * Save file data structure.
 * Contains versioning for migration and a timestamp for display.
 */
export interface SaveData {
  /** Save file format version (for migration handling) */
  version: string;

  /** ISO 8601 timestamp of when this save was created */
  timestamp: string;

  /** The complete game state */
  state: GameState;
}
