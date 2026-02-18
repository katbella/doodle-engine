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
        resolve
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

    // Get music and ambient from current location
    const locationData = registry.locations[state.currentLocation];
    const music = locationData?.music ?? '';
    const ambient = locationData?.ambient ?? '';

    // Resolve notification localization keys
    const notifications = state.notifications.map(resolve);

    // Copy pending sounds (filenames, no localization needed)
    const pendingSounds = [...state.pendingSounds];

    // Copy pending video
    const pendingVideo = state.pendingVideo;

    // Resolve pending interlude
    let pendingInterlude: SnapshotInterlude | null = null;
    if (state.pendingInterlude) {
        const interlude = registry.interludes[state.pendingInterlude];
        if (interlude) {
            pendingInterlude = {
                id: interlude.id,
                background: interlude.background,
                banner: interlude.banner,
                music: interlude.music,
                voice: interlude.voice,
                sounds: interlude.sounds,
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
        variables: { ...state.variables },
        time: state.currentTime,
        map,
        music,
        ambient,
        notifications,
        pendingSounds,
        pendingVideo,
        pendingInterlude,
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
        banner: location.banner,
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
        if (characterState.location === state.currentLocation) {
            const character = registry.characters[characterId];
            if (character) {
                charactersHere.push({
                    id: character.id,
                    name: resolve(character.name),
                    biography: resolve(character.biography),
                    portrait: character.portrait,
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
                    icon: item.icon,
                    image: item.image,
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
    resolve: (text: string) => string
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
        : 'Narrator';

    const dialogueSnapshot: SnapshotDialogue = {
        speaker: node.speaker,
        speakerName,
        text: resolve(node.text),
        portrait:
            node.portrait ?? registry.characters[node.speaker ?? '']?.portrait,
        voice: node.voice,
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
                    portrait: character.portrait,
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
                icon: item.icon,
                image: item.image,
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
 * This is a simplified version - in a real implementation, you might want to
 * determine which map to show based on the current location.
 */
function buildMapSnapshot(
    state: GameState,
    registry: ContentRegistry,
    resolve: (text: string) => string
): SnapshotMap | null {
    // For now, just return the first map in the registry
    // In a real implementation, you'd determine which map to show based on context
    const mapIds = Object.keys(registry.maps);
    if (mapIds.length === 0) return null;

    const map = registry.maps[mapIds[0]];
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
        image: map.image,
        scale: map.scale,
        locations,
    };
}
