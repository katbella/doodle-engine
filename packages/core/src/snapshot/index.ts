/**
 * Snapshot builder for the Doodle Engine.
 *
 * Builds a snapshot from the current game state and content registry.
 * A snapshot is everything the renderer needs to display the current moment:
 * - All localization resolved (@keys → text)
 * - All conditions evaluated (only visible choices included)
 * - All entity data enriched with full information
 *
 * The renderer never sees raw game state or content registry.
 */

import type { ContentRegistry, LocaleData } from '../types/registry';
import type { GameState } from '../types/state';
import type {
    Snapshot,
    SnapshotLocation,
    SnapshotCharacter,
    SnapshotItem,
    SnapshotChoice,
    SnapshotDialogue,
    SnapshotQuest,
    SnapshotJournalEntry,
    SnapshotMap,
    SnapshotMapLocation,
    SnapshotInterlude,
} from '../types/snapshot';
import { resolveText } from '../localization';
import { evaluateConditions } from '../conditions';
import { resolveAssetPath } from '../assets/paths';

// =============================================================================
// UI String Defaults
// =============================================================================

// Every label the built-in renderer shows. Locale files override any of
// these with a matching ui.* key; the English text is the default.
const UI_DEFAULTS: Record<string, string> = {
    'ui.continue': 'Continue',
    'ui.inventory': 'Inventory',
    'ui.journal': 'Journal',
    'ui.map': 'Map',
    'ui.save_load': 'Save/Load',
    'ui.settings': 'Settings',
    'ui.credits': 'Credits',
    'ui.made_with_doodle_engine': 'Made with Doodle Engine',
    'ui.save': 'Save',
    'ui.load': 'Load',
    'ui.new_game': 'New Game',
    'ui.resume': 'Resume',
    'ui.no_companions': 'No companions',
    'ui.narrator': 'Narrator',
    'ui.notes': 'Notes',
    'ui.characters': 'Characters',
    'ui.party': 'Party',
    'ui.resources': 'Resources',
    'ui.no_items': 'No items',
    'ui.location_banner': 'Location Banner',
    'ui.close': 'Close',
    'ui.paused': 'Paused',
    'ui.quit_to_title': 'Quit to Title',
    'ui.active_quests': 'Active Quests',
    'ui.entries': 'Entries',
    'ui.no_entries': 'No entries yet',
    'ui.audio': 'Audio',
    'ui.language': 'Language',
    'ui.volume_master': 'Master',
    'ui.volume_music': 'Music',
    'ui.volume_sound': 'Sound Effects',
    'ui.volume_voice': 'Voice',
    'ui.volume_ui': 'UI Sounds',
    'ui.back': 'Back',
    'ui.saved': 'Saved!',
    'ui.loaded': 'Loaded!',
    'ui.new_save': 'New Save',
    'ui.quick_save': 'Quick Save',
    'ui.autosave': 'Autosave',
    'ui.no_saves': 'No saves yet',
    'ui.delete': 'Delete',
    'ui.skip': 'Skip',
    'ui.skip_splash': 'Skip splash screen',
    'ui.menu': 'Menu',
    'ui.add_note': 'Add Note',
    'ui.note_title': 'Title',
    'ui.note_text': 'Write a note...',
    'ui.no_notes': 'No notes yet',
    'ui.loading': 'Loading...',
    'ui.loading_game_assets': 'Loading game assets...',
    'ui.ready': 'Ready!',
    'ui.error_loading_assets': 'Error loading assets',
    'ui.travel_to': 'Travel to {destination}?',
    'ui.travel_time_one': 'The journey will take 1 hour.',
    'ui.travel_time': 'The journey will take {hours} hours.',
    'ui.arrive': 'Arrive: Day {day}, {time}',
    'ui.travel': 'Travel',
    'ui.cancel': 'Cancel',
    'ui.day': 'Day {day}',
    'ui.time_dawn': 'Dawn',
    'ui.time_morning': 'Morning',
    'ui.time_midday': 'Midday',
    'ui.time_afternoon': 'Afternoon',
    'ui.time_evening': 'Evening',
    'ui.time_dusk': 'Dusk',
    'ui.time_night': 'Night',
};

const UI_KEYS = Object.keys(UI_DEFAULTS);

/**
 * Build the resolved UI strings record from locale data.
 * Falls back to English defaults for any missing keys.
 *
 * @param localeData - Flat locale key-value map for the current language
 * @returns Record of all UI keys with resolved strings
 */
export function buildUIStrings(localeData: LocaleData): Record<string, string> {
    const ui: Record<string, string> = {};
    for (const key of UI_KEYS) {
        ui[key] = localeData[key] ?? UI_DEFAULTS[key];
    }
    return ui;
}

/**
 * Build a complete snapshot from current game state.
 *
 * @param state - Current game state
 * @param registry - Content registry with all entities
 * @returns Complete snapshot ready for rendering
 */
export function buildSnapshot(
    state: GameState,
    registry: ContentRegistry
): Snapshot {
    // Get locale data for current language
    const localeData = registry.locales[state.currentLocale] ?? {};

    // Helper to resolve localization keys and {varName} interpolation
    const resolve = (text: string) =>
        resolveText(text, localeData, state.variables);

    // Build resolved UI strings (with English fallbacks)
    const ui = buildUIStrings(localeData);

    // Build location snapshot
    const location = buildLocationSnapshot(
        state.currentLocation,
        registry,
        resolve
    );

    // Build characters at current location
    const charactersHere = buildCharactersHereSnapshot(
        state,
        registry,
        resolve
    );

    // Build items at current location (not in inventory)
    const itemsHere = buildItemsHereSnapshot(state, registry, resolve);

    // Build dialogue and choices if in dialogue
    const { dialogue, choices } = buildDialogueSnapshot(
        state,
        registry,
        resolve,
        ui['ui.narrator']
    );

    // Build party members
    const party = buildPartySnapshot(state, registry, resolve);

    // Build inventory
    const inventory = buildInventorySnapshot(state, registry, resolve);

    // Build active quests
    const quests = buildQuestsSnapshot(state, registry, resolve);

    // Build unlocked journal entries
    const journal = buildJournalSnapshot(state, registry, resolve);

    // Build map (if enabled)
    const map = state.mapEnabled
        ? buildMapSnapshot(state, registry, resolve)
        : null;

    // Get music and ambient from current location, respecting any playMusic override
    const locationData = registry.locations[state.currentLocation];
    const music = resolveAssetPath(
        state.musicOverride ?? locationData?.music,
        'music'
    );
    const ambient = resolveAssetPath(locationData?.ambient, 'ambient');

    // Resolve notification localization keys
    const notifications = state.notifications.map(resolve);

    // Resolve pending sounds to full paths
    const pendingSounds = state.pendingSounds.map((s) =>
        resolveAssetPath(s, 'sfx')
    );

    // Resolve pending video to full path
    const pendingVideo = state.pendingVideo
        ? resolveAssetPath(state.pendingVideo, 'video')
        : null;

    // Resolve pending interlude
    let pendingInterlude: SnapshotInterlude | null = null;
    if (state.pendingInterlude) {
        const interlude = registry.interludes[state.pendingInterlude];
        if (interlude) {
            pendingInterlude = {
                id: interlude.id,
                background: resolveAssetPath(interlude.background, 'banner'),
                banner: resolveAssetPath(interlude.banner, 'banner'),
                music: resolveAssetPath(interlude.music, 'music'),
                voice: resolveAssetPath(interlude.voice, 'voice'),
                sounds: interlude.sounds?.map((s) =>
                    resolveAssetPath(s, 'sfx')
                ),
                scroll: interlude.scroll ?? true,
                scrollSpeed: interlude.scrollSpeed ?? 30,
                text: resolve(interlude.text),
            };
        }
    }

    return {
        location,
        charactersHere,
        itemsHere,
        choices,
        dialogue,
        party,
        inventory,
        quests,
        journal,
        playerNotes: [...state.playerNotes],
        variables: { ...state.variables },
        time: state.currentTime,
        map,
        music,
        ambient,
        notifications,
        pendingSounds,
        pendingVideo,
        pendingInterlude,
        ui,
        currentLocale: state.currentLocale,
    };
}

// =============================================================================
// Individual Snapshot Builders
// =============================================================================

/**
 * Build location snapshot with resolved localization.
 */
function buildLocationSnapshot(
    locationId: string,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotLocation {
    const location = registry.locations[locationId];

    if (!location) {
        // Fallback if location not found
        return {
            id: locationId,
            name: locationId,
            description: `Location not found: ${locationId}`,
            banner: '',
        };
    }

    return {
        id: location.id,
        name: resolve(location.name),
        description: resolve(location.description),
        banner: resolveAssetPath(location.banner, 'banner'),
    };
}

/**
 * Build snapshots for all characters at the current location.
 */
function buildCharactersHereSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotCharacter[] {
    const charactersHere: SnapshotCharacter[] = [];

    // Iterate through all characters and check if they're at this location
    for (const [characterId, characterState] of Object.entries(
        state.characterState
    )) {
        if (
            characterState.location === state.currentLocation &&
            !characterState.inParty
        ) {
            const character = registry.characters[characterId];
            if (character) {
                charactersHere.push({
                    id: character.id,
                    name: resolve(character.name),
                    biography: resolve(character.biography),
                    portrait: resolveAssetPath(character.portrait, 'portrait'),
                    location: characterState.location,
                    inParty: characterState.inParty,
                    relationship: characterState.relationship,
                    stats: characterState.stats,
                });
            }
        }
    }

    return charactersHere;
}

/**
 * Build snapshots for all items at the current location.
 * Excludes items in inventory.
 */
function buildItemsHereSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotItem[] {
    const itemsHere: SnapshotItem[] = [];

    // Iterate through item locations and check if they're at this location
    for (const [itemId, locationId] of Object.entries(state.itemLocations)) {
        if (locationId === state.currentLocation) {
            const item = registry.items[itemId];
            if (item) {
                itemsHere.push({
                    id: item.id,
                    name: resolve(item.name),
                    description: resolve(item.description),
                    icon: resolveAssetPath(item.icon, 'item'),
                    image: resolveAssetPath(item.image, 'item'),
                    stats: item.stats,
                });
            }
        }
    }

    return itemsHere;
}

/**
 * Build dialogue and choices snapshot if currently in dialogue.
 * Returns null dialogue and empty choices if not in dialogue.
 */
function buildDialogueSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string,
    narratorName: string
): { dialogue: SnapshotDialogue | null; choices: SnapshotChoice[] } {
    // Not in dialogue
    if (!state.dialogueState) {
        return { dialogue: null, choices: [] };
    }

    const dialogue = registry.dialogues[state.dialogueState.dialogueId];
    if (!dialogue) {
        return { dialogue: null, choices: [] };
    }

    const node = dialogue.nodes.find(
        (n) => n.id === state.dialogueState?.nodeId
    );
    if (!node) {
        return { dialogue: null, choices: [] };
    }

    // Build dialogue snapshot
    const speakerName = node.speaker
        ? resolve(registry.characters[node.speaker]?.name ?? node.speaker)
        : narratorName;

    const dialogueSnapshot: SnapshotDialogue = {
        speaker: node.speaker,
        speakerName,
        text: resolve(node.text),
        portrait: resolveAssetPath(
            node.portrait ?? registry.characters[node.speaker ?? '']?.portrait,
            'portrait'
        ),
        voice: resolveAssetPath(node.voice, 'voice'),
    };

    // Build choices - only include those whose conditions pass
    const choices: SnapshotChoice[] = node.choices
        .filter((choice) => {
            // If no conditions, always show
            if (!choice.conditions || choice.conditions.length === 0) {
                return true;
            }
            // Check if all conditions pass
            return evaluateConditions(choice.conditions, state);
        })
        .map((choice) => ({
            id: choice.id,
            text: resolve(choice.text),
        }));

    return { dialogue: dialogueSnapshot, choices };
}

/**
 * Build snapshots for all party members.
 */
function buildPartySnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotCharacter[] {
    const party: SnapshotCharacter[] = [];

    for (const [characterId, characterState] of Object.entries(
        state.characterState
    )) {
        if (characterState.inParty) {
            const character = registry.characters[characterId];
            if (character) {
                party.push({
                    id: character.id,
                    name: resolve(character.name),
                    biography: resolve(character.biography),
                    portrait: resolveAssetPath(character.portrait, 'portrait'),
                    location: characterState.location,
                    inParty: characterState.inParty,
                    relationship: characterState.relationship,
                    stats: characterState.stats,
                });
            }
        }
    }

    return party;
}

/**
 * Build snapshots for all items in inventory.
 */
function buildInventorySnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotItem[] {
    return state.inventory
        .map((itemId) => {
            const item = registry.items[itemId];
            if (!item) return null;

            return {
                id: item.id,
                name: resolve(item.name),
                description: resolve(item.description),
                icon: resolveAssetPath(item.icon, 'item'),
                image: resolveAssetPath(item.image, 'item'),
                stats: item.stats,
            };
        })
        .filter((item): item is SnapshotItem => item !== null);
}

/**
 * Build snapshots for all active quests.
 */
function buildQuestsSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotQuest[] {
    const quests: SnapshotQuest[] = [];

    for (const [questId, stageId] of Object.entries(state.questProgress)) {
        const quest = registry.quests[questId];
        if (!quest) continue;

        const stage = quest.stages.find((s) => s.id === stageId);
        if (!stage) continue;

        quests.push({
            id: quest.id,
            name: resolve(quest.name),
            description: resolve(quest.description),
            currentStage: stage.id,
            currentStageDescription: resolve(stage.description),
        });
    }

    return quests;
}

/**
 * Build snapshots for all unlocked journal entries.
 */
function buildJournalSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotJournalEntry[] {
    return state.unlockedJournalEntries
        .map((entryId) => {
            const entry = registry.journalEntries[entryId];
            if (!entry) return null;

            return {
                id: entry.id,
                title: resolve(entry.title),
                text: resolve(entry.text),
                category: entry.category,
            };
        })
        .filter((entry): entry is SnapshotJournalEntry => entry !== null);
}

/**
 * Build map snapshot with all locations.
 */
function buildMapSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotMap | null {
    const map = Object.values(registry.maps).find((candidate) =>
        candidate.locations.some((loc) => loc.id === state.currentLocation)
    );
    if (!map) return null;

    const locations: SnapshotMapLocation[] = map.locations.map((loc) => {
        const location = registry.locations[loc.id];
        return {
            id: loc.id,
            name: location ? resolve(location.name) : loc.id,
            x: loc.x,
            y: loc.y,
            isCurrent: loc.id === state.currentLocation,
        };
    });

    return {
        id: map.id,
        name: resolve(map.name),
        image: resolveAssetPath(map.image, 'map'),
        scale: map.scale,
        locations,
    };
}
