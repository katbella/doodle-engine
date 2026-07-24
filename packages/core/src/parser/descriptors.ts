/**
 * Descriptors for the closed sets of conditions (15) and effects (27).
 *
 * This is the single source of truth for *how each type is shaped* — its
 * grouping, its keyword form, and its ordered arguments with their kinds. The
 * types (`types/conditions.ts`, `types/effects.ts`), the parser (`./index.ts`),
 * and the serializer (`./serialize.ts`) still decide meaning; these descriptors
 * describe the same shapes as data so tools (Doodle Studio's builders,
 * validation, autocomplete) can drive UI and checks from the engine's real
 * definitions instead of hardcoding a fourth copy.
 *
 * A descriptor never computes meaning. Building a condition/effect from
 * descriptor values goes through the existing `parseCondition`/`parseEffect`
 * (via `serializeFromDescriptor` -> parse), so there is exactly one parser.
 */

import type { Condition } from '../types/conditions';
import type { Effect } from '../types/effects';

/**
 * The kind of an argument. Reference kinds name a content type so a picker can
 * be populated from the registry; scalar kinds pick a plain control.
 */
export type ArgKind =
    | 'flag' // free-form flag key (no declaration site)
    | 'variable' // free-form variable key
    | 'stat' // free-form character-stat key
    | 'itemId'
    | 'characterId'
    | 'locationId'
    | 'questId'
    | 'stageId' // depends on the questId chosen just before it
    | 'journalId'
    | 'dialogueId'
    | 'interludeId'
    | 'number'
    | 'value' // number or string (variableEquals / setVariable)
    | 'hours'
    | 'boolean'
    | 'text'; // display text: @key, "literal", or plain words (NOTIFY only)

/**
 * Which `ContentRegistry` collection a reference argument draws from, if any.
 * Values are the exact registry keys (e.g. `journalEntries`, not `journal`) so
 * a picker can do `registry[REFERENCE_KIND_TARGET[kind]]` directly.
 */
export const REFERENCE_KIND_TARGET: Partial<Record<ArgKind, string>> = {
    itemId: 'items',
    characterId: 'characters',
    locationId: 'locations',
    questId: 'quests',
    journalId: 'journalEntries',
    dialogueId: 'dialogues',
    interludeId: 'interludes',
};

/** One argument of a condition or effect. */
export interface ArgDescriptor {
    /** The property name on the built entity (e.g. `flag`, `questId`). */
    name: string;
    /** Label shown in a builder form. */
    label: string;
    /** Control/reference kind. */
    kind: ArgKind;
    /** Optional args may be left empty (only `playMusic.track` today). */
    optional?: boolean;
}

/** Grouping for the builder's searchable, sectioned type list. */
export type DescriptorGroup =
    | 'Flags'
    | 'Variables'
    | 'Inventory'
    | 'Quests'
    | 'Characters'
    | 'Location & time'
    | 'Journal'
    | 'Dialogue flow'
    | 'Media'
    | 'Map'
    | 'Roll';

export interface ConditionDescriptor {
    /** The discriminant on the `Condition` union. */
    type: Condition['type'];
    /** Human label for the type in the builder list. */
    label: string;
    group: DescriptorGroup;
    /** Ordered arguments, matching the `.dlg` keyword form. */
    args: ArgDescriptor[];
    /**
     * How the type appears in `.dlg`: the leading keyword is the `type` itself
     * for conditions (e.g. `hasFlag metBartender`).
     */
    keyword: string;
}

export interface EffectDescriptor {
    /** The discriminant on the `Effect` union. */
    type: Effect['type'];
    /** Human label for the type in the builder list. */
    label: string;
    group: DescriptorGroup;
    args: ArgDescriptor[];
    /**
     * The `.dlg` keyword form's leading tokens (e.g. `SET flag`, `ADD item`,
     * `GOTO location`, `NOTIFY`). Arguments follow in `args` order.
     */
    keyword: string;
}

/** All 15 conditions, in builder display order. */
export const CONDITION_DESCRIPTORS: ConditionDescriptor[] = [
    {
        type: 'hasFlag',
        label: 'Has flag',
        group: 'Flags',
        keyword: 'hasFlag',
        args: [{ name: 'flag', label: 'Flag', kind: 'flag' }],
    },
    {
        type: 'notFlag',
        label: 'Not flag',
        group: 'Flags',
        keyword: 'notFlag',
        args: [{ name: 'flag', label: 'Flag', kind: 'flag' }],
    },
    {
        type: 'hasItem',
        label: 'Has item',
        group: 'Inventory',
        keyword: 'hasItem',
        args: [{ name: 'itemId', label: 'Item', kind: 'itemId' }],
    },
    {
        type: 'variableEquals',
        label: 'Variable equals',
        group: 'Variables',
        keyword: 'variableEquals',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'value', label: 'Value', kind: 'value' },
        ],
    },
    {
        type: 'variableGreaterThan',
        label: 'Variable greater than',
        group: 'Variables',
        keyword: 'variableGreaterThan',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'value', label: 'Value', kind: 'number' },
        ],
    },
    {
        type: 'variableLessThan',
        label: 'Variable less than',
        group: 'Variables',
        keyword: 'variableLessThan',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'value', label: 'Value', kind: 'number' },
        ],
    },
    {
        type: 'atLocation',
        label: 'At location',
        group: 'Location & time',
        keyword: 'atLocation',
        args: [{ name: 'locationId', label: 'Location', kind: 'locationId' }],
    },
    {
        type: 'questAtStage',
        label: 'Quest at stage',
        group: 'Quests',
        keyword: 'questAtStage',
        args: [
            { name: 'questId', label: 'Quest', kind: 'questId' },
            { name: 'stageId', label: 'Stage', kind: 'stageId' },
        ],
    },
    {
        type: 'characterAt',
        label: 'Character at location',
        group: 'Characters',
        keyword: 'characterAt',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'locationId', label: 'Location', kind: 'locationId' },
        ],
    },
    {
        type: 'characterInParty',
        label: 'Character in party',
        group: 'Characters',
        keyword: 'characterInParty',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
        ],
    },
    {
        type: 'relationshipAbove',
        label: 'Relationship above',
        group: 'Characters',
        keyword: 'relationshipAbove',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'value', label: 'Value', kind: 'number' },
        ],
    },
    {
        type: 'relationshipBelow',
        label: 'Relationship below',
        group: 'Characters',
        keyword: 'relationshipBelow',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'value', label: 'Value', kind: 'number' },
        ],
    },
    {
        type: 'timeIs',
        label: 'Time of day is',
        group: 'Location & time',
        keyword: 'timeIs',
        args: [
            { name: 'startHour', label: 'Start hour', kind: 'number' },
            { name: 'endHour', label: 'End hour', kind: 'number' },
        ],
    },
    {
        type: 'itemAt',
        label: 'Item at location',
        group: 'Inventory',
        keyword: 'itemAt',
        args: [
            { name: 'itemId', label: 'Item', kind: 'itemId' },
            { name: 'locationId', label: 'Location', kind: 'locationId' },
        ],
    },
    {
        type: 'roll',
        label: 'Dice roll vs threshold',
        group: 'Roll',
        keyword: 'roll',
        args: [
            { name: 'min', label: 'Min', kind: 'number' },
            { name: 'max', label: 'Max', kind: 'number' },
            { name: 'threshold', label: 'Threshold', kind: 'number' },
        ],
    },
];

/** All 27 effects, in builder display order. */
export const EFFECT_DESCRIPTORS: EffectDescriptor[] = [
    {
        type: 'setFlag',
        label: 'Set flag',
        group: 'Flags',
        keyword: 'SET flag',
        args: [{ name: 'flag', label: 'Flag', kind: 'flag' }],
    },
    {
        type: 'clearFlag',
        label: 'Clear flag',
        group: 'Flags',
        keyword: 'CLEAR flag',
        args: [{ name: 'flag', label: 'Flag', kind: 'flag' }],
    },
    {
        type: 'setVariable',
        label: 'Set variable',
        group: 'Variables',
        keyword: 'SET variable',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'value', label: 'Value', kind: 'value' },
        ],
    },
    {
        type: 'addVariable',
        label: 'Add to variable',
        group: 'Variables',
        keyword: 'ADD variable',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'value', label: 'Amount', kind: 'number' },
        ],
    },
    {
        type: 'addItem',
        label: 'Add item',
        group: 'Inventory',
        keyword: 'ADD item',
        args: [{ name: 'itemId', label: 'Item', kind: 'itemId' }],
    },
    {
        type: 'removeItem',
        label: 'Remove item',
        group: 'Inventory',
        keyword: 'REMOVE item',
        args: [{ name: 'itemId', label: 'Item', kind: 'itemId' }],
    },
    {
        type: 'moveItem',
        label: 'Move item to location',
        group: 'Inventory',
        keyword: 'MOVE item',
        args: [
            { name: 'itemId', label: 'Item', kind: 'itemId' },
            { name: 'locationId', label: 'Location', kind: 'locationId' },
        ],
    },
    {
        type: 'goToLocation',
        label: 'Go to location',
        group: 'Location & time',
        keyword: 'GOTO location',
        args: [{ name: 'locationId', label: 'Location', kind: 'locationId' }],
    },
    {
        type: 'advanceTime',
        label: 'Advance time',
        group: 'Location & time',
        keyword: 'ADVANCE time',
        args: [{ name: 'hours', label: 'Hours', kind: 'hours' }],
    },
    {
        type: 'setQuestStage',
        label: 'Set quest stage',
        group: 'Quests',
        keyword: 'SET questStage',
        args: [
            { name: 'questId', label: 'Quest', kind: 'questId' },
            { name: 'stageId', label: 'Stage', kind: 'stageId' },
        ],
    },
    {
        type: 'addJournalEntry',
        label: 'Add journal entry',
        group: 'Journal',
        keyword: 'ADD journalEntry',
        args: [{ name: 'entryId', label: 'Journal entry', kind: 'journalId' }],
    },
    {
        type: 'startDialogue',
        label: 'Start dialogue',
        group: 'Dialogue flow',
        keyword: 'START dialogue',
        args: [{ name: 'dialogueId', label: 'Dialogue', kind: 'dialogueId' }],
    },
    {
        type: 'endDialogue',
        label: 'End dialogue',
        group: 'Dialogue flow',
        keyword: 'END dialogue',
        args: [],
    },
    {
        type: 'setCharacterLocation',
        label: 'Set character location',
        group: 'Characters',
        keyword: 'SET characterLocation',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'locationId', label: 'Location', kind: 'locationId' },
        ],
    },
    {
        type: 'addToParty',
        label: 'Add to party',
        group: 'Characters',
        keyword: 'ADD toParty',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
        ],
    },
    {
        type: 'removeFromParty',
        label: 'Remove from party',
        group: 'Characters',
        keyword: 'REMOVE fromParty',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
        ],
    },
    {
        type: 'setRelationship',
        label: 'Set relationship',
        group: 'Characters',
        keyword: 'SET relationship',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'value', label: 'Value', kind: 'number' },
        ],
    },
    {
        type: 'addRelationship',
        label: 'Add relationship',
        group: 'Characters',
        keyword: 'ADD relationship',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'value', label: 'Amount', kind: 'number' },
        ],
    },
    {
        type: 'setCharacterStat',
        label: 'Set character stat',
        group: 'Characters',
        keyword: 'SET characterStat',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'stat', label: 'Stat', kind: 'stat' },
            { name: 'value', label: 'Value', kind: 'value' },
        ],
    },
    {
        type: 'addCharacterStat',
        label: 'Add to character stat',
        group: 'Characters',
        keyword: 'ADD characterStat',
        args: [
            { name: 'characterId', label: 'Character', kind: 'characterId' },
            { name: 'stat', label: 'Stat', kind: 'stat' },
            { name: 'value', label: 'Amount', kind: 'number' },
        ],
    },
    {
        type: 'setMapEnabled',
        label: 'Enable / disable map',
        group: 'Map',
        keyword: 'SET mapEnabled',
        args: [{ name: 'enabled', label: 'Enabled', kind: 'boolean' }],
    },
    {
        type: 'playMusic',
        label: 'Play music',
        group: 'Media',
        keyword: 'MUSIC',
        args: [{ name: 'track', label: 'Track', kind: 'text', optional: true }],
    },
    {
        type: 'playSound',
        label: 'Play sound',
        group: 'Media',
        keyword: 'SOUND',
        args: [{ name: 'sound', label: 'Sound', kind: 'text' }],
    },
    {
        type: 'notify',
        label: 'Notify',
        group: 'Media',
        keyword: 'NOTIFY',
        args: [{ name: 'message', label: 'Message', kind: 'text' }],
    },
    {
        type: 'playVideo',
        label: 'Play video',
        group: 'Media',
        keyword: 'VIDEO',
        args: [{ name: 'file', label: 'File', kind: 'text' }],
    },
    {
        type: 'showInterlude',
        label: 'Show interlude',
        group: 'Media',
        keyword: 'INTERLUDE',
        args: [
            { name: 'interludeId', label: 'Interlude', kind: 'interludeId' },
        ],
    },
    {
        type: 'roll',
        label: 'Roll into variable',
        group: 'Roll',
        keyword: 'ROLL',
        args: [
            { name: 'variable', label: 'Variable', kind: 'variable' },
            { name: 'min', label: 'Min', kind: 'number' },
            { name: 'max', label: 'Max', kind: 'number' },
        ],
    },
];

/** Look up a condition descriptor by its `type`. */
export function conditionDescriptor(
    type: Condition['type']
): ConditionDescriptor {
    const found = CONDITION_DESCRIPTORS.find((d) => d.type === type);
    if (!found) throw new Error(`No descriptor for condition type "${type}"`);
    return found;
}

/** Look up an effect descriptor by its `type`. */
export function effectDescriptor(type: Effect['type']): EffectDescriptor {
    const found = EFFECT_DESCRIPTORS.find((d) => d.type === type);
    if (!found) throw new Error(`No descriptor for effect type "${type}"`);
    return found;
}
