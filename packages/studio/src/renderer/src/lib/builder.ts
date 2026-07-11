/**
 * Logic for the condition/effect builders.
 *
 * The builder is a form over `{ type, values }`, where `values` maps each
 * descriptor argument name to its string form. This layer converts between that
 * draft and the engine's `Condition`/`Effect` entities, and — crucially —
 * builds entities by handing the canonical `.dlg` line to the engine's own
 * `parseCondition`/`parseEffect`. That keeps one parser: the builder never
 * constructs entities by hand, so it can't disagree with the runtime.
 */

import {
    parseCondition,
    parseEffect,
    serializeCondition,
    serializeEffect,
    conditionDescriptor,
    effectDescriptor,
    type Condition,
    type Effect,
    type ConditionDescriptor,
    type EffectDescriptor,
    type ArgDescriptor,
} from '@doodle-engine/core';

/** A builder draft: the chosen type plus a string value per argument. */
export interface BuilderDraft {
    type: string;
    values: Record<string, string>;
}

/** Group descriptors by their `group` for a sectioned list, keeping order. */
export function groupDescriptors<T extends { group: string }>(
    descriptors: T[]
): [string, T[]][] {
    const groups: [string, T[]][] = [];
    for (const d of descriptors) {
        const existing = groups.find(([g]) => g === d.group);
        if (existing) existing[1].push(d);
        else groups.push([d.group, [d]]);
    }
    return groups;
}

/** The canonical `.dlg` line a draft will produce (for the live preview). */
export function draftToSource(
    draft: BuilderDraft,
    descriptor: ConditionDescriptor | EffectDescriptor
): string {
    const parts = [descriptor.keyword];
    for (const arg of descriptor.args) {
        const value = draft.values[arg.name] ?? '';
        if (value === '' && arg.optional) continue;
        parts.push(value);
    }
    return parts.join(' ').trim();
}

/** Turn an existing condition into a draft by reading its descriptor args. */
export function conditionToDraft(condition: Condition): BuilderDraft {
    const descriptor = conditionDescriptor(condition.type);
    return {
        type: condition.type,
        values: valuesFromEntity(
            condition as unknown as Record<string, unknown>,
            descriptor
        ),
    };
}

/** Turn an existing effect into a draft. */
export function effectToDraft(effect: Effect): BuilderDraft {
    const descriptor = effectDescriptor(effect.type);
    return {
        type: effect.type,
        values: valuesFromEntity(
            effect as unknown as Record<string, unknown>,
            descriptor
        ),
    };
}

/** Read each descriptor arg's value off the entity as a string. */
function valuesFromEntity(
    entity: Record<string, unknown>,
    descriptor: ConditionDescriptor | EffectDescriptor
): Record<string, string> {
    const values: Record<string, string> = {};
    for (const arg of descriptor.args) {
        const raw = entity[arg.name];
        values[arg.name] = raw === undefined || raw === null ? '' : String(raw);
    }
    return values;
}

/** A fresh draft for a type, with empty (or sensible default) values. */
export function emptyDraft(
    descriptor: ConditionDescriptor | EffectDescriptor
): BuilderDraft {
    const values: Record<string, string> = {};
    for (const arg of descriptor.args) {
        values[arg.name] = defaultFor(arg);
    }
    return { type: descriptor.type, values };
}

function defaultFor(arg: ArgDescriptor): string {
    if (arg.kind === 'boolean') return 'true';
    if (arg.kind === 'number' || arg.kind === 'hours') return '0';
    return '';
}

export interface BuildResult<T> {
    ok: boolean;
    /** The built entity, when ok. */
    value?: T;
    /** A human message when not ok. */
    error?: string;
}

/**
 * Build a Condition from a draft via the engine parser.
 *
 * `inRequire` rejects `roll` exactly as the parser does inside a REQUIRE — a
 * roll is a side-effecting check that can't gate a choice.
 */
export function buildCondition(
    draft: BuilderDraft,
    inRequire: boolean
): BuildResult<Condition> {
    if (inRequire && draft.type === 'roll') {
        return {
            ok: false,
            error: 'roll can’t be used as a requirement — it has a side effect. Use it as an IF branch or an effect instead.',
        };
    }
    const descriptor = conditionDescriptor(draft.type as Condition['type']);
    const missing = firstMissing(draft, descriptor);
    if (missing) return { ok: false, error: `${missing.label} is required.` };
    try {
        return {
            ok: true,
            value: parseCondition(draftToSource(draft, descriptor)),
        };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/** Build an Effect from a draft via the engine parser. */
export function buildEffect(draft: BuilderDraft): BuildResult<Effect> {
    const descriptor = effectDescriptor(draft.type as Effect['type']);
    const missing = firstMissing(draft, descriptor);
    if (missing) return { ok: false, error: `${missing.label} is required.` };
    try {
        return {
            ok: true,
            value: parseEffect(draftToSource(draft, descriptor)),
        };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

/** The first required arg with an empty value, or null if all are filled. */
function firstMissing(
    draft: BuilderDraft,
    descriptor: ConditionDescriptor | EffectDescriptor
): ArgDescriptor | null {
    for (const arg of descriptor.args) {
        if (arg.optional) continue;
        if ((draft.values[arg.name] ?? '').trim() === '') return arg;
    }
    return null;
}

/** Serialize helpers re-exported so callers keep one import surface. */
export { serializeCondition, serializeEffect };
