/**
 * Effect type definitions for the Doodle Engine.
 * Effects are mutations to game state that run in order.
 * All effects use a discriminated union pattern for extensibility.
 */

/**
 * Set a flag to true.
 * Example: SET flag metBartender
 */
export interface SetFlagEffect {
    type: 'setFlag';
    /** Flag key to set */
    flag: string;
}

/**
 * Set a flag to false.
 * Example: CLEAR flag doorLocked
 */
export interface ClearFlagEffect {
    type: 'clearFlag';
    /** Flag key to clear */
    flag: string;
}

/**
 * Set a variable to a specific value.
 * Example: SET variable gold 100
 */
export interface SetVariableEffect {
    type: 'setVariable';
    /** Variable key to set */
    variable: string;
    /** Value to set */
    value: number | string;
}

/**
 * Add to (or subtract from) a variable.
 * Example: ADD variable gold -50
 */
export interface AddVariableEffect {
    type: 'addVariable';
    /** Variable key to modify */
    variable: string;
    /** Amount to add (can be negative) */
    value: number;
}

/**
 * Add an item to player's inventory.
 * Example: ADD item rusty_key
 */
export interface AddItemEffect {
    type: 'addItem';
    /** Item ID to add */
    itemId: string;
}

/**
 * Remove an item from player's inventory.
 * Example: REMOVE item rusty_key
 */
export interface RemoveItemEffect {
    type: 'removeItem';
    /** Item ID to remove */
    itemId: string;
}

/**
 * Move an item to a specific location.
 * Example: MOVE item rusty_key cellar
 */
export interface MoveItemEffect {
    type: 'moveItem';
    /** Item ID to move */
    itemId: string;
    /** Destination location ID */
    locationId: string;
}

/**
 * Change player's current location.
 * Example: GOTO location tavern
 */
export interface GoToLocationEffect {
    type: 'goToLocation';
    /** Destination location ID */
    locationId: string;
}

/**
 * Advance game time by a number of hours.
 * Example: ADVANCE time 2
 */
export interface AdvanceTimeEffect {
    type: 'advanceTime';
    /** Hours to advance */
    hours: number;
}

/**
 * Set a quest to a specific stage.
 * Example: SET questStage odd_jobs started
 */
export interface SetQuestStageEffect {
    type: 'setQuestStage';
    /** Quest ID */
    questId: string;
    /** Stage ID to set */
    stageId: string;
}

/**
 * Unlock a journal entry for the player.
 * Example: ADD journalEntry tavern_discovery
 */
export interface AddJournalEntryEffect {
    type: 'addJournalEntry';
    /** Journal entry ID to unlock */
    entryId: string;
}

/**
 * Start a dialogue.
 * Example: START dialogue merchant_intro
 */
export interface StartDialogueEffect {
    type: 'startDialogue';
    /** Dialogue ID to start */
    dialogueId: string;
}

/**
 * End the current dialogue.
 * Example: END dialogue
 */
export interface EndDialogueEffect {
    type: 'endDialogue';
}

/**
 * Move a character to a specific location.
 * Example: SET characterLocation merchant tavern
 */
export interface SetCharacterLocationEffect {
    type: 'setCharacterLocation';
    /** Character ID */
    characterId: string;
    /** Destination location ID */
    locationId: string;
}

/**
 * Add a character to the player's party.
 * Example: ADD toParty elisa
 */
export interface AddToPartyEffect {
    type: 'addToParty';
    /** Character ID to add */
    characterId: string;
}

/**
 * Remove a character from the player's party.
 * Example: REMOVE fromParty elisa
 */
export interface RemoveFromPartyEffect {
    type: 'removeFromParty';
    /** Character ID to remove */
    characterId: string;
}

/**
 * Set relationship value with a character.
 * Example: SET relationship bartender 5
 */
export interface SetRelationshipEffect {
    type: 'setRelationship';
    /** Character ID */
    characterId: string;
    /** Relationship value to set */
    value: number;
}

/**
 * Add to (or subtract from) relationship with a character.
 * Example: ADD relationship bartender 1
 */
export interface AddRelationshipEffect {
    type: 'addRelationship';
    /** Character ID */
    characterId: string;
    /** Amount to add (can be negative) */
    value: number;
}

/**
 * Set a stat value on a character.
 * Example: SET characterStat elisa level 5
 */
export interface SetCharacterStatEffect {
    type: 'setCharacterStat';
    /** Character ID */
    characterId: string;
    /** Stat key to set */
    stat: string;
    /** Value to set */
    value: unknown;
}

/**
 * Add to (or subtract from) a character stat.
 * Example: ADD characterStat elisa health -10
 */
export interface AddCharacterStatEffect {
    type: 'addCharacterStat';
    /** Character ID */
    characterId: string;
    /** Stat key to modify */
    stat: string;
    /** Amount to add (can be negative) */
    value: number;
}

/**
 * Enable or disable the map.
 * Example: SET mapEnabled false
 */
export interface SetMapEnabledEffect {
    type: 'setMapEnabled';
    /** Whether map should be enabled */
    enabled: boolean;
}

/**
 * Play a music track (emitted to renderer).
 * Example: MUSIC tension_theme.ogg
 */
export interface PlayMusicEffect {
    type: 'playMusic';
    /** Music track filename */
    track: string;
}

/**
 * Play a sound effect (emitted to renderer).
 * Example: SOUND door_slam.ogg
 */
export interface PlaySoundEffect {
    type: 'playSound';
    /** Sound effect filename */
    sound: string;
}

/**
 * Add a notification for the player.
 * Example: NOTIFY @quest.odd_jobs.started
 */
export interface NotifyEffect {
    type: 'notify';
    /** Notification message (supports @localization keys) */
    message: string;
}

/**
 * Play a video/cutscene (emitted to renderer).
 * Example: VIDEO intro.mp4
 */
export interface PlayVideoEffect {
    type: 'playVideo';
    /** Video filename */
    file: string;
}

/**
 * Show a narrative interlude (full-screen text scene).
 * Example: INTERLUDE chapter_one
 */
export interface ShowInterludeEffect {
    type: 'showInterlude';
    /** Interlude ID to display */
    interludeId: string;
}

/**
 * Roll a random integer and store it in a variable.
 * Example: ROLL bluffRoll 1 20
 */
export interface RollEffect {
    type: 'roll';
    /** Variable to store the result in */
    variable: string;
    /** Minimum value (inclusive) */
    min: number;
    /** Maximum value (inclusive) */
    max: number;
}

/**
 * Union of all effect types.
 * This discriminated union allows authors to extend with custom effects.
 */
export type Effect =
    | SetFlagEffect
    | ClearFlagEffect
    | SetVariableEffect
    | AddVariableEffect
    | AddItemEffect
    | RemoveItemEffect
    | MoveItemEffect
    | GoToLocationEffect
    | AdvanceTimeEffect
    | SetQuestStageEffect
    | AddJournalEntryEffect
    | StartDialogueEffect
    | EndDialogueEffect
    | SetCharacterLocationEffect
    | AddToPartyEffect
    | RemoveFromPartyEffect
    | SetRelationshipEffect
    | AddRelationshipEffect
    | SetCharacterStatEffect
    | AddCharacterStatEffect
    | SetMapEnabledEffect
    | PlayMusicEffect
    | PlaySoundEffect
    | NotifyEffect
    | PlayVideoEffect
    | ShowInterludeEffect
    | RollEffect;
