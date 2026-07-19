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
import type { StudioAssetKind } from '../../../shared/project';
import { FolderOpen } from '../lib/icons';
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

/** Media effect arguments that name an asset file. */
const MEDIA_ARG_KIND: Record<string, StudioAssetKind> = {
    'playVideo.file': 'video',
    'playSound.sound': 'sfx',
    'playMusic.track': 'music',
};

const MEDIA_PLACEHOLDER: Partial<Record<StudioAssetKind, string>> = {
    video: 'intro.mp4',
    sfx: 'door.ogg',
    music: 'theme.ogg',
};

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
    projectDir,
}: {
    mode: 'condition' | 'effect';
    registry: ContentRegistry;
    inRequire?: boolean;
    initial?: Condition | Effect;
    onCommit: (entity: Condition | Effect) => void;
    onCancel: () => void;
    /** Enables the file picker on media filename arguments. */
    projectDir?: string;
}) {
    const descriptors: Descriptor[] =
        mode === 'condition' ? CONDITION_DESCRIPTORS : EFFECT_DESCRIPTORS;

    const [query, setQuery] = useState('');
    const [touched, setTouched] = useState<Set<string>>(() => new Set());
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
        setTouched(new Set());
    };

    const showError = !result.ok && touched.size > 0;

    const noun =
        mode === 'condition'
            ? inRequire
                ? 'requirement'
                : 'condition'
            : 'effect';

    return (
        <div className="builder" role="dialog" aria-label={`Build ${mode}`}>
            <div className="modal__title">
                {initial ? `Edit ${noun}` : `Add ${noun}`}
            </div>
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
                            projectDir={projectDir}
                            assetKind={
                                mode === 'effect'
                                    ? MEDIA_ARG_KIND[
                                          `${draft.type}.${arg.name}`
                                      ]
                                    : undefined
                            }
                            onChange={(v) => setValue(arg.name, v)}
                            onBlur={() =>
                                setTouched((current) =>
                                    new Set(current).add(arg.name)
                                )
                            }
                        />
                    ))}
                </div>
            )}

            <div
                className={`builder__preview ${
                    result.ok
                        ? ''
                        : showError
                          ? 'builder__preview--bad'
                          : 'builder__preview--pending'
                }`}
            >
                <div className="builder__preview-label">Generated source</div>
                <span className="builder__preview-line mono">
                    {mode === 'condition' && inRequire ? 'REQUIRE ' : ''}
                    {draftToSource(draft, descriptor)}
                </span>
                {showError && result.error && (
                    <div className="builder__error">{result.error}</div>
                )}
                {!result.ok && !showError && (
                    <div className="builder__requirement">
                        Complete the required fields to add this {mode}.
                    </div>
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
    projectDir,
    assetKind,
    onChange,
    onBlur,
}: {
    arg: ArgDescriptor;
    value: string;
    registry: ContentRegistry;
    /** The quest chosen in this same builder, so stage lists the right stages. */
    questId?: string;
    projectDir?: string;
    /** Set when this argument is a media filename; shows a file picker. */
    assetKind?: StudioAssetKind;
    onChange: (value: string) => void;
    onBlur: () => void;
}) {
    const [choosing, setChoosing] = useState(false);
    const chooseAsset = async () => {
        if (!projectDir || !assetKind) return;
        setChoosing(true);
        try {
            const selected = await window.studio.importAsset(
                projectDir,
                assetKind
            );
            if (selected) onChange(selected);
        } finally {
            setChoosing(false);
            onBlur();
        }
    };
    const label = (
        <span className="builder__arg-label">
            {arg.label}
            {arg.optional && (
                <span className="builder__arg-opt"> (optional)</span>
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
                    onBlur={onBlur}
                >
                    <option value="">
                        {quest ? '(pick a stage)' : '(pick a quest first)'}
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
                    onBlur={onBlur}
                >
                    <option value="">(pick)</option>
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
                    onBlur={onBlur}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            </label>
        );
    }

    if (assetKind && projectDir) {
        return (
            <label className="builder__arg">
                {label}
                <div className="asset-field">
                    <input
                        className="dlg__input mono"
                        value={value}
                        placeholder={MEDIA_PLACEHOLDER[assetKind] ?? 'filename'}
                        spellCheck={false}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                    />
                    <button
                        className="btn asset-field__choose"
                        type="button"
                        disabled={choosing}
                        aria-label={`Choose a file for ${arg.label}`}
                        onClick={() => void chooseAsset()}
                    >
                        <FolderOpen size={14} aria-hidden />
                        {choosing ? 'Choosing…' : 'Choose file…'}
                    </button>
                </div>
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
                onBlur={onBlur}
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
