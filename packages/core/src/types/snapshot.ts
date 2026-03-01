/**
 * Snapshot type definitions for the Doodle Engine.
 * A snapshot is a point-in-time view of the game state formatted for rendering.
 * The renderer displays snapshots but never sees raw game state.
 */

import type { Time } from './state';

/**
 * Location information in a snapshot (localized).
 */
export interface SnapshotLocation {
    /** Location ID */
    id: string;
    /** Localized display name */
    name: string;
    /** Localized description text */
    description: string;
    /** Banner image filename */
    banner: string;
}

/**
 * Character information in a snapshot (localized).
 */
export interface SnapshotCharacter {
    /** Character ID */
    id: string;
    /** Localized display name */
    name: string;
    /** Localized biography text */
    biography: string;
    /** Portrait image filename */
    portrait: string;
    /** Current location ID */
    location: string;
    /** Whether this character is in the party */
    inParty: boolean;
    /** Relationship value with the player */
    relationship: number;
    /** Character stats */
    stats: Record<string, unknown>;
}

/**
 * Item information in a snapshot (localized).
 */
export interface SnapshotItem {
    /** Item ID */
    id: string;
    /** Localized display name */
    name: string;
    /** Localized description text */
    description: string;
    /** Icon image filename */
    icon: string;
    /** Large image filename */
    image: string;
    /** Item stats */
    stats: Record<string, unknown>;
}

/**
 * A player choice in a dialogue (localized).
 */
export interface SnapshotChoice {
    /** Choice ID */
    id: string;
    /** Localized choice text */
    text: string;
}

/**
 * Current dialogue node information (localized).
 */
export interface SnapshotDialogue {
    /** Character ID speaking, or null for narration */
    speaker: string | null;
    /** Localized speaker name (or "Narrator") */
    speakerName: string;
    /** Localized dialogue text */
    text: string;
    /** Portrait image filename (if speaker is a character) */
    portrait?: string;
    /** Voice audio filename (optional) */
    voice?: string;
}

/**
 * Quest information in a snapshot (localized).
 */
export interface SnapshotQuest {
    /** Quest ID */
    id: string;
    /** Localized quest name */
    name: string;
    /** Localized quest description */
    description: string;
    /** Current stage ID */
    currentStage: string;
    /** Localized current stage description */
    currentStageDescription: string;
}

/**
 * Journal entry information in a snapshot (localized).
 */
export interface SnapshotJournalEntry {
    /** Entry ID */
    id: string;
    /** Localized entry title */
    title: string;
    /** Localized entry text */
    text: string;
    /** Entry category */
    category: string;
}

/**
 * Map location marker in a snapshot (localized).
 */
export interface SnapshotMapLocation {
    /** Location ID */
    id: string;
    /** Localized location name */
    name: string;
    /** X coordinate on map */
    x: number;
    /** Y coordinate on map */
    y: number;
    /** Whether this is the player's current location */
    isCurrent: boolean;
}

/**
 * Map information in a snapshot (localized).
 */
export interface SnapshotMap {
    /** Map ID */
    id: string;
    /** Localized map name */
    name: string;
    /** Map image filename */
    image: string;
    /** Map scale for travel time calculation */
    scale: number;
    /** Locations on this map */
    locations: SnapshotMapLocation[];
}

/**
 * Interlude information in a snapshot (localized).
 */
export interface SnapshotInterlude {
    /** Interlude ID */
    id: string;
    /** Background image filename */
    background: string;
    /** Optional decorative banner/frame image */
    banner?: string;
    /** Optional music track filename */
    music?: string;
    /** Optional narration audio filename */
    voice?: string;
    /** Optional ambient sound filenames */
    sounds?: string[];
    /** Whether text auto-scrolls (resolved default: true) */
    scroll: boolean;
    /** Auto-scroll speed in px/s (resolved default: 30) */
    scrollSpeed: number;
    /** Localized narrative text */
    text: string;
}

/**
 * A snapshot represents everything the renderer needs to display the current moment.
 * All localization has been resolved, all conditions have been evaluated.
 * The renderer never sees raw game state, content registry, or localization keys.
 */
export interface Snapshot {
    /** Current location information */
    location: SnapshotLocation;

    /** Characters at the current location */
    charactersHere: SnapshotCharacter[];

    /** Items at the current location (not in inventory) */
    itemsHere: SnapshotItem[];

    /** Available dialogue choices (only if in dialogue) */
    choices: SnapshotChoice[];

    /** Current dialogue node (null if not in dialogue) */
    dialogue: SnapshotDialogue | null;

    /** Characters in the player's party */
    party: SnapshotCharacter[];

    /** Items in the player's inventory */
    inventory: SnapshotItem[];

    /** Active quests with current stages */
    quests: SnapshotQuest[];

    /** Unlocked journal entries */
    journal: SnapshotJournalEntry[];

    /** Game variables (gold, counters, etc.) */
    variables: Record<string, number | string>;

    /** Current in-game time */
    time: Time;

    /** Map data (null if map is disabled) */
    map: SnapshotMap | null;

    /** Current music track filename */
    music: string;

    /** Current ambient sound filename */
    ambient: string;

    /** Notifications to display (cleared after shown) */
    notifications: string[];

    /** Sound effects to play (from recent playSound effects) */
    pendingSounds: string[];

    /** Video to play fullscreen (from playVideo effect) */
    pendingVideo: string | null;

    /** Interlude to show fullscreen (from showInterlude effect or trigger) */
    pendingInterlude: SnapshotInterlude | null;

    /** Resolved UI strings for the renderer. All @keys resolved. */
    ui: Record<string, string>;
}
