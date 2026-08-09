/**
 * Game state type definitions for the Doodle Engine.
 * These represent all mutable data that changes during gameplay.
 */

import type { StatValue } from './entities';

/**
 * In-game time representation.
 */
export interface Time {
    /** Current day number (1-based) */
    day: number;
    /** Current hour (0-23) */
    hour: number;
}

/**
 * Mutable state for a single character.
 */
export interface CharacterState {
    /** Current location ID where this character is */
    location: string;
    /** Whether this character is traveling with the player */
    inParty: boolean;
    /** Disposition value toward the player */
    relationship: number;
    /** Game-specific stat values */
    stats: Record<string, StatValue>;
}

export interface PlayerCharacterState {
    /** Whether this game asks the player to supply profile text */
    playerCreatesProfile: boolean;
    /** Player-facing name */
    name: string;
    /** Player-facing title */
    title: string;
    /** Player-facing biography */
    biography: string;
    /** Portrait reference used by custom renderers */
    portrait: string;
    /** Whether required player-created profile data has been supplied */
    profileComplete: boolean;
    /** Game-specific stat values */
    stats: Record<string, StatValue>;
}

export interface PlayerProfileInput {
    name: string;
    title?: string;
    biography?: string;
    portrait?: string;
}

/**
 * Current dialogue state.
 */
export interface DialogueState {
    /** ID of the active dialogue */
    dialogueId: string;
    /** ID of the current node in that dialogue */
    nodeId: string;
}

/**
 * A note written by the player.
 */
export interface PlayerNote {
    /** Unique ID for this note */
    id: string;
    /** Note title */
    title: string;
    /** Note content */
    text: string;
}

/**
 * Complete game state - everything that changes during play.
 * This is what gets saved and loaded.
 */
export interface GameState {
    /** Mutable player profile and stats */
    player?: PlayerCharacterState;

    /** Location ID where the player currently is */
    currentLocation: string;

    /** Current in-game time */
    currentTime: Time;

    /** True/false values for story tracking */
    flags: Record<string, boolean>;

    /** Numbers or strings for quantities, names, etc. */
    variables: Record<string, number | string>;

    /** Item IDs the player is carrying */
    inventory: string[];

    /** Current stage for each started quest (questId -> stageId) */
    questProgress: Record<string, string>;

    /** Quest ID the player is currently tracking, or null */
    trackedQuest: string | null;

    /** Journal entry IDs that have been unlocked */
    unlockedJournalEntries: string[];

    /** Notes the player has written */
    playerNotes: PlayerNote[];

    /** Current conversation state, or null if not in dialogue */
    dialogueState: DialogueState | null;

    /** All mutable character data (characterId -> CharacterState) */
    characterState: Record<string, CharacterState>;

    /** Current location of each item (itemId -> locationId or "inventory") */
    itemLocations: Record<string, string>;

    /** Whether the player can open the map */
    mapEnabled: boolean;

    /** Recent events to show the player (cleared after shown) */
    notifications: string[];

    /** Sound effects to play (cleared after snapshot is built) */
    pendingSounds: string[];

    /** Music track override set by a playMusic effect (null = use location.music) */
    musicOverride: string | null;

    /** Video to play (cleared after snapshot is built) */
    pendingVideo: string | null;

    /** Interlude ID to show (cleared after snapshot is built) */
    pendingInterlude: string | null;

    /** Active language code (e.g., "en", "es") */
    currentLocale: string;
}
