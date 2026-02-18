/**
 * Content registry type definitions for the Doodle Engine.
 *
 * The content registry is a read-only store of all game content
 * loaded from YAML and DSL files. It's populated at startup and
 * never modified during gameplay.
 */

import type {
    Location,
    Character,
    Item,
    Map,
    Dialogue,
    Quest,
    JournalEntry,
    Interlude,
} from './entities';

/**
 * Localization dictionary mapping keys to translated strings.
 *
 * Example:
 * ```ts
 * {
 *   "location.tavern.name": "The Salty Dog",
 *   "bartender.greeting.welcome": "Welcome to the Salty Dog, stranger."
 * }
 * ```
 */
export interface LocaleData {
    [key: string]: string;
}

/**
 * Content registry containing all game content.
 * All lookups are by ID using Record<id, entity> for O(1) access.
 */
export interface ContentRegistry {
    /** All locations indexed by ID */
    locations: Record<string, Location>;

    /** All characters indexed by ID */
    characters: Record<string, Character>;

    /** All items indexed by ID */
    items: Record<string, Item>;

    /** All maps indexed by ID */
    maps: Record<string, Map>;

    /** All dialogues indexed by ID */
    dialogues: Record<string, Dialogue>;

    /** All quests indexed by ID */
    quests: Record<string, Quest>;

    /** All journal entries indexed by ID */
    journalEntries: Record<string, JournalEntry>;

    /** All interludes indexed by ID */
    interludes: Record<string, Interlude>;

    /** All locales indexed by language code (e.g., "en", "es") */
    locales: Record<string, LocaleData>;
}
