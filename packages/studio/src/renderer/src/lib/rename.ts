import {
    applyDialogueEdits,
    conditionDescriptor,
    effectDescriptor,
    parseDialogue,
    REFERENCE_KIND_TARGET,
    type Condition,
    type ContentRegistry,
    type Dialogue,
    type Effect,
    type GameConfig,
} from '@doodle-engine/core';
import type { YamlEdit } from '../../../shared/project';
import type { CreatableSection } from './new-content';

/**
 * The registry collection whose ids a rename affects. Renaming a locale or map
 * only touches its own file (nothing else references a locale or map id), so
 * those aren't here.
 */
type Collection =
    | 'locations'
    | 'characters'
    | 'items'
    | 'quests'
    | 'dialogues'
    | 'interludes'
    | 'journalEntries';

const SECTION_COLLECTION: Partial<Record<CreatableSection, Collection>> = {
    locations: 'locations',
    characters: 'characters',
    items: 'items',
    quests: 'quests',
    dialogues: 'dialogues',
    interludes: 'interludes',
    journal: 'journalEntries',
};

/** What is being renamed: an entity of some section, or a flag/variable key. */
export type RenameTarget =
    | { section: CreatableSection }
    | { kind: 'flag' | 'variable' };

/** A dialogue whose references were rewritten; the caller re-serializes it. */
export interface DialogueRewrite {
    id: string;
    dialogue: Dialogue;
}

export interface RenamePlan {
    /** YAML files to edit, with the collection each id belongs to. Maps show
     * up here (their markers name locations) even though map ids themselves
     * are never referenced; 'game' means game.yaml. */
    yamlEdits: {
        collection: Collection | 'maps' | 'game';
        id: string;
        edits: YamlEdit[];
    }[];
    /** Dialogues whose in-file references changed. */
    dialogueRewrites: DialogueRewrite[];
}

/** True when an arg of this kind holds the id being renamed. Entity renames
 * match by reference target (characterId → characters); flag/variable renames
 * match the kind directly (flag, variable). */
type ArgMatcher = (kind: string) => boolean;

function matcherFor(target: RenameTarget): ArgMatcher {
    if ('kind' in target) {
        return (kind) => kind === target.kind;
    }
    const collection = SECTION_COLLECTION[target.section];
    return (kind) => REFERENCE_KIND_TARGET[kind as never] === collection;
}

/**
 * Swap the old id for the new one in a condition or effect's reference args,
 * using the engine's descriptor to know which args hold which id kind. Returns
 * the same object when nothing changed.
 */
function rewriteArgs<T extends Condition | Effect>(
    entity: T,
    argKinds: { name: string; kind: string }[],
    matches: ArgMatcher,
    oldId: string,
    newId: string
): { changed: boolean; entity: T } {
    const record = entity as unknown as Record<string, unknown>;
    let changed = false;
    let next = record;
    for (const arg of argKinds) {
        if (!matches(arg.kind)) continue;
        if (record[arg.name] !== oldId) continue;
        if (next === record) next = { ...record };
        next[arg.name] = newId;
        changed = true;
    }
    return { changed, entity: (changed ? next : record) as T };
}

function rewriteCondition(
    condition: Condition,
    matches: ArgMatcher,
    oldId: string,
    newId: string
) {
    const descriptor = conditionDescriptor(condition.type);
    return rewriteArgs(condition, descriptor.args, matches, oldId, newId);
}

function rewriteEffect(
    effect: Effect,
    matches: ArgMatcher,
    oldId: string,
    newId: string
) {
    const descriptor = effectDescriptor(effect.type);
    return rewriteArgs(effect, descriptor.args, matches, oldId, newId);
}

/** Rewrite every reference to oldId inside one dialogue's structure:
 * top-level REQUIRE conditions, the trigger location, node speakers, and the
 * condition/effect arguments in nodes, branches, and choices. */
function rewriteDialogue(
    dialogue: Dialogue,
    matches: ArgMatcher,
    oldId: string,
    newId: string,
    renameSpeaker: boolean,
    renameTrigger: boolean
): { changed: boolean; dialogue: Dialogue } {
    let changed = false;

    const conditions = (list: Condition[] | undefined) =>
        list?.map((c) => {
            const r = rewriteCondition(c, matches, oldId, newId);
            if (r.changed) changed = true;
            return r.entity;
        });
    const effects = (list: Effect[] | undefined) =>
        list?.map((e) => {
            const r = rewriteEffect(e, matches, oldId, newId);
            if (r.changed) changed = true;
            return r.entity;
        });

    const topConditions = conditions(dialogue.conditions);

    const nodes = dialogue.nodes.map((node) => {
        let speaker = node.speaker;
        if (renameSpeaker && speaker === oldId) {
            speaker = newId;
            changed = true;
        }
        return {
            ...node,
            speaker,
            conditions: conditions(node.conditions),
            effects: effects(node.effects),
            conditionalBranches: node.conditionalBranches?.map((b) => {
                const rewritten = rewriteCondition(
                    b.condition,
                    matches,
                    oldId,
                    newId
                );
                if (rewritten.changed) changed = true;
                return {
                    ...b,
                    condition: rewritten.entity,
                    effects: effects(b.effects),
                };
            }),
            choices: node.choices.map((choice) => ({
                ...choice,
                conditions: conditions(choice.conditions),
                effects: effects(choice.effects),
            })),
        };
    });

    let triggerLocation = dialogue.triggerLocation;
    if (renameTrigger && triggerLocation === oldId) {
        triggerLocation = newId;
        changed = true;
    }

    return {
        changed,
        dialogue: { ...dialogue, nodes, triggerLocation, conditions: topConditions },
    };
}

/**
 * Rewrite one dialogue's references directly in its source text. Parses the
 * source as it is on disk right now, so the rewrite never carries along
 * anything except the rename itself. Returns the new source, or null when
 * the dialogue does not reference the id.
 */
export function rewriteDialogueSource(
    source: string,
    dialogueId: string,
    target: RenameTarget,
    oldId: string,
    newId: string
): string | null {
    const parsed = parseDialogue(source, dialogueId);
    const matches = matcherFor(target);
    const isEntity = !('kind' in target);
    const r = rewriteDialogue(
        parsed,
        matches,
        oldId,
        newId,
        isEntity && target.section === 'characters',
        isEntity && target.section === 'locations'
    );
    if (!r.changed) return null;
    return applyDialogueEdits(source, dialogueId, r.dialogue);
}

/** YAML edits that point a condition/effect list's reference args at newId. */
function conditionEffectYamlEdits(
    listKey: string,
    conditions: Condition[] | undefined,
    effects: Effect[] | undefined,
    effectsKey: string,
    matches: ArgMatcher,
    oldId: string,
    newId: string
): YamlEdit[] {
    const edits: YamlEdit[] = [];
    (conditions ?? []).forEach((condition, i) => {
        for (const arg of conditionDescriptor(condition.type).args) {
            if (!matches(arg.kind)) continue;
            if ((condition as any)[arg.name] !== oldId) continue;
            edits.push({ path: [listKey, i, arg.name], value: newId });
        }
    });
    (effects ?? []).forEach((effect, i) => {
        for (const arg of effectDescriptor(effect.type).args) {
            if (!matches(arg.kind)) continue;
            if ((effect as any)[arg.name] !== oldId) continue;
            edits.push({ path: [effectsKey, i, arg.name], value: newId });
        }
    });
    return edits;
}

/**
 * Plan every reference edit for renaming an id, without touching files. The
 * caller renames the file, applies the YAML edits, and rewrites each listed
 * dialogue from its current source (rewriteDialogueSource). Plan from a
 * freshly validated project so the reference list is current.
 */
export function planRename(
    registry: ContentRegistry,
    section: CreatableSection,
    oldId: string,
    newId: string,
    config?: GameConfig
): RenamePlan {
    const collection = SECTION_COLLECTION[section];
    const yamlEdits: RenamePlan['yamlEdits'] = [];
    const dialogueRewrites: DialogueRewrite[] = [];
    if (!collection) return { yamlEdits, dialogueRewrites };

    const target: RenameTarget = { section };
    const matches = matcherFor(target);

    // YAML entity references (specific keys only — never description/name/text).
    if (collection === 'locations' || collection === 'characters') {
        // A character can be an item's container, so both share the item.location key.
        for (const item of Object.values(registry.items)) {
            if (item.location === oldId)
                yamlEdits.push({
                    collection: 'items',
                    id: item.id,
                    edits: [{ path: ['location'], value: newId }],
                });
        }
    }
    if (collection === 'locations') {
        for (const c of Object.values(registry.characters)) {
            if (c.location === oldId)
                yamlEdits.push({
                    collection: 'characters',
                    id: c.id,
                    edits: [{ path: ['location'], value: newId }],
                });
        }
        for (const map of Object.values(registry.maps)) {
            (map.locations ?? []).forEach((marker, i) => {
                if (marker.id === oldId)
                    yamlEdits.push({
                        collection: 'maps',
                        id: map.id,
                        edits: [{ path: ['locations', i, 'id'], value: newId }],
                    });
            });
        }
    }
    if (collection === 'dialogues') {
        for (const c of Object.values(registry.characters)) {
            if (c.dialogue === oldId)
                yamlEdits.push({
                    collection: 'characters',
                    id: c.id,
                    edits: [{ path: ['dialogue'], value: newId }],
                });
        }
    }

    // Interludes reference ids from their trigger location, trigger
    // conditions, and effects.
    for (const interlude of Object.values(registry.interludes)) {
        const edits: YamlEdit[] = [];
        if (collection === 'locations' && interlude.triggerLocation === oldId) {
            edits.push({ path: ['triggerLocation'], value: newId });
        }
        edits.push(
            ...conditionEffectYamlEdits(
                'triggerConditions',
                interlude.triggerConditions,
                interlude.effects,
                'effects',
                matches,
                oldId,
                newId
            )
        );
        if (edits.length > 0) {
            yamlEdits.push({ collection: 'interludes', id: interlude.id, edits });
        }
    }

    // game.yaml: the start location and starting inventory.
    if (config) {
        const edits: YamlEdit[] = [];
        if (collection === 'locations' && config.startLocation === oldId) {
            edits.push({ path: ['startLocation'], value: newId });
        }
        if (collection === 'items') {
            (config.startInventory ?? []).forEach((itemId, i) => {
                if (itemId === oldId) {
                    edits.push({ path: ['startInventory', i], value: newId });
                }
            });
        }
        if (edits.length > 0) {
            yamlEdits.push({ collection: 'game', id: 'game', edits });
        }
    }

    // Dialogue (.dlg) references — structural fields only.
    for (const dialogue of Object.values(registry.dialogues)) {
        const r = rewriteDialogue(
            dialogue,
            matches,
            oldId,
            newId,
            collection === 'characters',
            collection === 'locations'
        );
        if (r.changed)
            dialogueRewrites.push({ id: dialogue.id, dialogue: r.dialogue });
    }

    return { yamlEdits, dialogueRewrites };
}

/**
 * Plan a flag or variable rename. These are free-form keys with no file of their
 * own, so this only rewrites their uses: dialogue conditions/effects, interlude
 * conditions/effects, and the game.yaml start block. A flag/variable can also
 * be set implicitly by content this can't see, so the caller should present it
 * as "review these usages," not a guaranteed-safe rename.
 */
export function planFlagVariableRename(
    registry: ContentRegistry,
    kind: 'flag' | 'variable',
    oldId: string,
    newId: string,
    config: { startFlags?: Record<string, unknown>; startVariables?: Record<string, unknown> }
): RenamePlan {
    const dialogueRewrites: DialogueRewrite[] = [];
    const matches: ArgMatcher = (k) => k === kind;

    for (const dialogue of Object.values(registry.dialogues)) {
        const r = rewriteDialogue(dialogue, matches, oldId, newId, false, false);
        if (r.changed)
            dialogueRewrites.push({ id: dialogue.id, dialogue: r.dialogue });
    }

    const yamlEdits: RenamePlan['yamlEdits'] = [];

    // Interludes can read and set flags/variables too.
    for (const interlude of Object.values(registry.interludes)) {
        const edits = conditionEffectYamlEdits(
            'triggerConditions',
            interlude.triggerConditions,
            interlude.effects,
            'effects',
            matches,
            oldId,
            newId
        );
        if (edits.length > 0) {
            yamlEdits.push({ collection: 'interludes', id: interlude.id, edits });
        }
    }

    // game.yaml start block: move the key by removing the old and setting the
    // new (YamlEdit has no key-rename op; value: undefined removes a key).
    const block = kind === 'flag' ? 'startFlags' : 'startVariables';
    const start = kind === 'flag' ? config.startFlags : config.startVariables;
    if (start && oldId in start) {
        yamlEdits.push({
            collection: 'game',
            id: 'game',
            edits: [
                { path: [block, newId], value: start[oldId] },
                { path: [block, oldId], value: undefined },
            ],
        });
    }

    return { yamlEdits, dialogueRewrites };
}
