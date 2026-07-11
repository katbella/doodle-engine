import { useMemo, useState } from 'react';
import {
    CONDITION_DESCRIPTORS,
    EFFECT_DESCRIPTORS,
    REFERENCE_KIND_TARGET,
    conditionDescriptor,
    effectDescriptor,
    type Condition,
    type Effect,
    type ArgDescriptor,
    type ConditionDescriptor,
    type EffectDescriptor,
} from '@doodle-engine/core';
import type { ContentRegistry } from '@doodle-engine/core';
import {
    type BuilderDraft,
    buildCondition,
    buildEffect,
    conditionToDraft,
    effectToDraft,
    draftToSource,
    emptyDraft,
    groupDescriptors,
} from '../lib/builder';

type Descriptor = ConditionDescriptor | EffectDescriptor;

/**
 * The condition/effect builder popover.
 *
 * `mode` picks the descriptor set and the entity it emits. `inRequire` is true
 * when building a choice requirement, so `roll` is rejected exactly as the
 * parser does. Reference arguments render a picker populated from the loaded
 * registry, so a chosen id always exists.
 */
export function ConditionEffectBuilder({
    mode,
    registry,
    inRequire = false,
    initial,
    onCommit,
    onCancel,
}: {
    mode: 'condition' | 'effect';
    registry: ContentRegistry;
    inRequire?: boolean;
    initial?: Condition | Effect;
    onCommit: (entity: Condition | Effect) => void;
    onCancel: () => void;
}) {
    const descriptors: Descriptor[] =
        mode === 'condition' ? CONDITION_DESCRIPTORS : EFFECT_DESCRIPTORS;

    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState<BuilderDraft>(() => {
        if (initial)
            return mode === 'condition'
                ? conditionToDraft(initial as Condition)
                : effectToDraft(initial as Effect);
        return emptyDraft(descriptors[0]);
    });

    const descriptor: Descriptor =
        mode === 'condition'
            ? conditionDescriptor(draft.type as Condition['type'])
            : effectDescriptor(draft.type as Effect['type']);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? descriptors.filter(
                  (d) =>
                      d.label.toLowerCase().includes(q) ||
                      d.type.toLowerCase().includes(q) ||
                      d.keyword.toLowerCase().includes(q)
              )
            : descriptors;
        return groupDescriptors(filtered);
    }, [descriptors, query]);

    const result =
        mode === 'condition'
            ? buildCondition(draft, inRequire)
            : buildEffect(draft);

    const setValue = (name: string, value: string) =>
        setDraft((d) => ({ ...d, values: { ...d.values, [name]: value } }));

    const pick = (type: string) => {
        const next =
            mode === 'condition'
                ? conditionDescriptor(type as Condition['type'])
                : effectDescriptor(type as Effect['type']);
        setDraft(emptyDraft(next));
    };

    return (
        <div className="builder" role="dialog" aria-label={`Build ${mode}`}>
            <input
                className="builder__search"
                placeholder={`Search ${mode}s…`}
                value={query}
                autoFocus
                spellCheck={false}
                onChange={(e) => setQuery(e.target.value)}
            />

            <div className="builder__list scroll">
                {groups.map(([group, items]) => (
                    <div key={group} className="builder__group">
                        <div className="builder__group-head">{group}</div>
                        {items.map((d) => (
                            <button
                                key={d.type}
                                className={`builder__type ${d.type === draft.type ? 'builder__type--on' : ''}`}
                                onClick={() => pick(d.type)}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                ))}
                {groups.length === 0 && (
                    <div className="builder__empty">No matches</div>
                )}
            </div>

            {descriptor.args.length > 0 && (
                <div className="builder__args">
                    {descriptor.args.map((arg) => (
                        <ArgField
                            key={arg.name}
                            arg={arg}
                            value={draft.values[arg.name] ?? ''}
                            registry={registry}
                            questId={draft.values.questId}
                            onChange={(v) => setValue(arg.name, v)}
                        />
                    ))}
                </div>
            )}

            <div
                className={`builder__preview ${result.ok ? '' : 'builder__preview--bad'}`}
            >
                <div className="builder__preview-label">Generated source</div>
                <span className="builder__preview-line mono">
                    {mode === 'condition' && inRequire ? 'REQUIRE ' : ''}
                    {draftToSource(draft, descriptor)}
                </span>
                {!result.ok && result.error && (
                    <div className="builder__error">{result.error}</div>
                )}
            </div>

            <div className="builder__actions">
                <button className="btn" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    className="btn btn--accent"
                    disabled={!result.ok}
                    onClick={() => result.value && onCommit(result.value)}
                >
                    {initial ? 'Update' : 'Add'}
                </button>
            </div>
        </div>
    );
}

/** One argument control, chosen by kind. Reference kinds use a registry picker. */
function ArgField({
    arg,
    value,
    registry,
    questId,
    onChange,
}: {
    arg: ArgDescriptor;
    value: string;
    registry: ContentRegistry;
    /** The quest chosen in this same builder, so stage lists the right stages. */
    questId?: string;
    onChange: (value: string) => void;
}) {
    const label = (
        <span className="builder__arg-label">
            {arg.label}
            {arg.optional && (
                <span className="builder__arg-opt"> — optional</span>
            )}
        </span>
    );

    // Stage depends on the quest picked just before it.
    if (arg.kind === 'stageId') {
        const quest = questId ? registry.quests[questId] : undefined;
        const stages = quest?.stages ?? [];
        return (
            <label className="builder__arg">
                {label}
                <select
                    className="dlg__select"
                    value={value}
                    disabled={!quest}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">
                        {quest ? '— pick a stage —' : '— pick a quest first —'}
                    </option>
                    {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.id}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    // Reference kinds: a dropdown of ids that exist right now.
    const target = REFERENCE_KIND_TARGET[arg.kind];
    if (target) {
        const ids = Object.keys(
            (registry as unknown as Record<string, Record<string, unknown>>)[
                target
            ] ?? {}
        );
        return (
            <label className="builder__arg">
                {label}
                <select
                    className="dlg__select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">— pick —</option>
                    {ids.map((id) => (
                        <option key={id} value={id}>
                            {id}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    if (arg.kind === 'boolean') {
        return (
            <label className="builder__arg">
                {label}
                <select
                    className="dlg__select"
                    value={value || 'true'}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            </label>
        );
    }

    const numeric = arg.kind === 'number' || arg.kind === 'hours';
    return (
        <label className="builder__arg">
            {label}
            <input
                className="dlg__input mono"
                type={numeric ? 'number' : 'text'}
                value={value}
                placeholder={placeholderFor(arg)}
                spellCheck={false}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}

function placeholderFor(arg: ArgDescriptor): string {
    switch (arg.kind) {
        case 'flag':
            return 'flagName';
        case 'variable':
            return 'variableName';
        case 'stat':
            return 'statName';
        case 'value':
            return 'number or word';
        case 'text':
            return '@key, "literal", or filename';
        default:
            return '';
    }
}
