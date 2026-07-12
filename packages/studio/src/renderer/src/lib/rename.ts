import {
    conditionDescriptor,
    effectDescriptor,
    REFERENCE_KIND_TARGET,
    type Condition,
    type ContentRegistry,
    type Dialogue,
    type Effect,
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

/** A dialogue whose references were rewritten; the caller re-serializes it. */
export interface DialogueRewrite {
    id: string;
    dialogue: Dialogue;
}

export interface RenamePlan {
    /** YAML files to edit, by entity id, with the field edits to apply. */
    yamlEdits: { id: string; edits: YamlEdit[] }[];
    /** Dialogues whose in-file references changed. */
    dialogueRewrites: DialogueRewrite[];
}

/**
 * Swap the old id for the new one in a condition or effect's reference args,
 * using the engine's descriptor to know which args hold which id kind. Returns
 * the same object when nothing changed.
 */
/** True when an arg of this kind holds the id being renamed. Entity renames
 * match by reference target (characterId → characters); flag/variable renames
 * match the kind directly (flag, variable). */
type ArgMatcher = (kind: string) => boolean;

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

/** Rewrite every reference to oldId inside one dialogue's structure.
 * `renameSpeaker`/`renameTrigger` apply only for character/location renames. */
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
            conditionalBranches: node.conditionalBranches?.map((b) => ({
                ...b,
                condition: rewriteCondition(b.condition, matches, oldId, newId)
                    .entity,
                effects: effects(b.effects),
            })),
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

    return { changed, dialogue: { ...dialogue, nodes, triggerLocation } };
}

/**
 * Plan every reference edit for renaming an id, without touching files. The
 * caller renames the file, applies the YAML edits, and re-serializes each
 * dialogue rewrite. References are found in the parsed registry; the validator
 * runs afterward and catches anything a rename missed.
 */
export function planRename(
    registry: ContentRegistry,
    section: CreatableSection,
    oldId: string,
    newId: string
): RenamePlan {
    const collection = SECTION_COLLECTION[section];
    const yamlEdits: { id: string; edits: YamlEdit[] }[] = [];
    const dialogueRewrites: DialogueRewrite[] = [];
    if (!collection) return { yamlEdits, dialogueRewrites };

    // YAML entity references (specific keys only — never description/name/text).
    if (collection === 'locations' || collection === 'characters') {
        // A character can be an item's container, so both share the item.location key.
        for (const item of Object.values(registry.items)) {
            if (item.location === oldId)
                yamlEdits.push({
                    id: item.id,
                    edits: [{ path: ['location'], value: newId }],
                });
        }
    }
    if (collection === 'locations') {
        for (const c of Object.values(registry.characters)) {
            if (c.location === oldId)
                yamlEdits.push({
                    id: c.id,
                    edits: [{ path: ['location'], value: newId }],
                });
        }
        for (const map of Object.values(registry.maps)) {
            map.locations.forEach((marker, i) => {
                if (marker.id === oldId)
                    yamlEdits.push({
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
                    id: c.id,
                    edits: [{ path: ['dialogue'], value: newId }],
                });
        }
    }

    // Dialogue (.dlg) references — structural fields only.
    const matches: ArgMatcher = (kind) =>
        REFERENCE_KIND_TARGET[kind as never] === collection;
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
 * own, so this only rewrites their uses: dialogue conditions/effects and the
 * game.yaml start block. A flag/variable can also be set implicitly by content
 * this can't see, so the caller should present it as "review these usages," not
 * a guaranteed-safe rename.
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

    // game.yaml start block: move the key by removing the old and setting the
    // new (YamlEdit has no key-rename op; value: undefined removes a key).
    const yamlEdits: { id: string; edits: YamlEdit[] }[] = [];
    const block = kind === 'flag' ? 'startFlags' : 'startVariables';
    const start = kind === 'flag' ? config.startFlags : config.startVariables;
    if (start && oldId in start) {
        yamlEdits.push({
            id: 'game',
            edits: [
                { path: [block, newId], value: start[oldId] },
                { path: [block, oldId], value: undefined },
            ],
        });
    }

    return { yamlEdits, dialogueRewrites };
}
