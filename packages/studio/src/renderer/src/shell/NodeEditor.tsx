import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X, Plus, Pencil, Play } from '../lib/icons';
import {
    isValidIdentifier,
    serializeCondition,
    serializeEffect,
} from '@doodle-engine/core';
import type {
    Choice,
    ConditionalBranch,
    Condition,
    ContentRegistry,
    DialogueNode,
    Effect,
} from '@doodle-engine/core';
import { ConditionEffectBuilder } from './ConditionEffectBuilder';
import { AssetField } from './AssetField';
import { LocalizedTextField } from './LocalizedTextField';
import { ConfirmModal } from './ConfirmModal';
import { OverlayPortal } from './OverlayPortal';
import { useModalDismiss } from '../lib/useModalDismiss';

/** Editable node id. */
function NodeIdField({
    id,
    nodeIds,
    onRename,
}: {
    id: string;
    nodeIds: string[];
    onRename: (newId: string) => void;
}) {
    const [text, setText] = useState(id);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        setText(id);
        setError(null);
    }, [id]);

    const commit = () => {
        const value = text.trim();
        if (!isValidIdentifier(value)) {
            setError('Use letters, numbers, and underscores only.');
            return;
        }
        if (value !== id && nodeIds.includes(value)) {
            setError('A node with this ID already exists.');
            return;
        }
        setError(null);
        if (value !== id) onRename(value);
    };

    return (
        <div className="node-editor__id-field">
            <input
                className={`dlg__input mono node-editor__id-input ${error ? 'dlg__input--invalid' : ''}`}
                value={text}
                spellCheck={false}
                onChange={(e) => setText(e.target.value)}
                onBlur={commit}
                title="Node id (used by GOTO targets)"
                aria-invalid={Boolean(error)}
            />
            {error && <span className="field__error">{error}</span>}
        </div>
    );
}

/** The builder in a centered modal, like every other focused editing task. */
function BuilderModal({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    useModalDismiss(onClose);
    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onClose}>
                <div
                    className="builder-modal"
                    onClick={(event) => event.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        </OverlayPortal>
    );
}

/** A single required condition (used by IF branches), edited via the builder. */
function SingleConditionField({
    condition,
    registry,
    projectDir,
    onChange,
}: {
    condition: Condition;
    registry: ContentRegistry;
    projectDir?: string;
    onChange: (condition: Condition) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                className="dlg__chip mono"
                onClick={() => setOpen(true)}
                title="Edit condition"
            >
                {serializeCondition(condition)}
            </button>
            {open && (
                <BuilderModal onClose={() => setOpen(false)}>
                    <ConditionEffectBuilder
                        mode="condition"
                        registry={registry}
                        projectDir={projectDir}
                        initial={condition}
                        onCommit={(entity) => {
                            onChange(entity as Condition);
                            setOpen(false);
                        }}
                        onCancel={() => setOpen(false)}
                    />
                </BuilderModal>
            )}
        </div>
    );
}

/** A read-only condition/effect chip that opens the builder when clicked. */
function BuilderRow({
    label,
    onEdit,
    onRemove,
}: {
    label: string;
    onEdit: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="dlg__row">
            <button className="dlg__chip mono" onClick={onEdit} title="Edit">
                <span>{label}</span>
                <Pencil className="dlg__chip-edit" size={11} aria-hidden />
            </button>
            <button className="dlg__x" onClick={onRemove} aria-label="Remove">
                <X size={15} />
            </button>
        </div>
    );
}

export function EffectList({
    effects,
    registry,
    projectDir,
    onChange,
}: {
    effects: Effect[];
    registry: ContentRegistry;
    /** Enables the file picker on media filename arguments. */
    projectDir?: string;
    onChange: (effects: Effect[]) => void;
}) {
    // `null` = closed; a number = editing that row; -1 = adding a new one.
    const [open, setOpen] = useState<number | null>(null);

    const commit = (entity: Condition | Effect) => {
        const effect = entity as Effect;
        if (open === -1) onChange([...effects, effect]);
        else if (open !== null)
            onChange(effects.map((e, j) => (j === open ? effect : e)));
        setOpen(null);
    };

    return (
        <div className="dlg__list">
            {effects.map((effect, i) => (
                <BuilderRow
                    key={i}
                    label={serializeEffect(effect)}
                    onEdit={() => setOpen(i)}
                    onRemove={() => onChange(effects.filter((_, j) => j !== i))}
                />
            ))}
            <div>
                <button className="dlg__add" onClick={() => setOpen(-1)}>
                    <Plus size={13} /> Add effect
                </button>
                {open !== null && (
                    <BuilderModal onClose={() => setOpen(null)}>
                        <ConditionEffectBuilder
                            mode="effect"
                            registry={registry}
                            projectDir={projectDir}
                            initial={open >= 0 ? effects[open] : undefined}
                            onCommit={commit}
                            onCancel={() => setOpen(null)}
                        />
                    </BuilderModal>
                )}
            </div>
        </div>
    );
}

export function ConditionList({
    conditions,
    registry,
    inRequire = false,
    projectDir,
    onChange,
}: {
    conditions: Condition[];
    registry: ContentRegistry;
    /** True inside a choice's Requirements, where `roll` is rejected. */
    inRequire?: boolean;
    /** Enables the file picker on media filename arguments. */
    projectDir?: string;
    onChange: (conditions: Condition[]) => void;
}) {
    const [open, setOpen] = useState<number | null>(null);

    const commit = (entity: Condition | Effect) => {
        const condition = entity as Condition;
        if (open === -1) onChange([...conditions, condition]);
        else if (open !== null)
            onChange(conditions.map((c, j) => (j === open ? condition : c)));
        setOpen(null);
    };

    return (
        <div className="dlg__list">
            {conditions.map((condition, i) => (
                <BuilderRow
                    key={i}
                    label={serializeCondition(condition)}
                    onEdit={() => setOpen(i)}
                    onRemove={() =>
                        onChange(conditions.filter((_, j) => j !== i))
                    }
                />
            ))}
            <div>
                <button className="dlg__add" onClick={() => setOpen(-1)}>
                    <Plus size={13} /> Add{' '}
                    {inRequire ? 'requirement' : 'condition'}
                </button>
                {open !== null && (
                    <BuilderModal onClose={() => setOpen(null)}>
                        <ConditionEffectBuilder
                            mode="condition"
                            registry={registry}
                            inRequire={inRequire}
                            projectDir={projectDir}
                            initial={open >= 0 ? conditions[open] : undefined}
                            onCommit={commit}
                            onCancel={() => setOpen(null)}
                        />
                    </BuilderModal>
                )}
            </div>
        </div>
    );
}

function TargetSelect({
    value,
    nodeIds,
    includeEnd,
    onChange,
    onCreateNode,
}: {
    value: string;
    nodeIds: string[];
    includeEnd?: boolean;
    onChange: (value: string) => void;
    /** Create a node with this id and select it as the target. */
    onCreateNode?: (id: string) => void;
}) {
    const [creating, setCreating] = useState(false);
    const [draftId, setDraftId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const commitCreate = () => {
        const id = draftId.trim();
        if (!isValidIdentifier(id)) {
            setError('Use letters, numbers, and underscores only.');
            return;
        }
        if (nodeIds.includes(id)) {
            setError('A node with this ID already exists.');
            return;
        }
        onChange(id);
        onCreateNode?.(id);
        setCreating(false);
        setDraftId('');
        setError(null);
    };

    return (
        <div className="target-select">
            <select
                className="dlg__select"
                value={creating ? '__new__' : value}
                onChange={(e) => {
                    if (e.target.value === '__new__') {
                        setCreating(true);
                        setDraftId('');
                        setError(null);
                        return;
                    }
                    setCreating(false);
                    onChange(e.target.value);
                }}
            >
                <option value="">(none)</option>
                {includeEnd && <option value="__end__">end dialogue</option>}
                {nodeIds.map((id) => (
                    <option key={id} value={id}>
                        {id}
                    </option>
                ))}
                {onCreateNode && <option value="__new__">New node…</option>}
            </select>
            {creating && (
                <div className="target-select__create">
                    <input
                        className={`dlg__input mono ${error ? 'dlg__input--invalid' : ''}`}
                        value={draftId}
                        placeholder="new_node_id"
                        autoFocus
                        spellCheck={false}
                        aria-label="New node id"
                        onChange={(e) => {
                            setDraftId(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitCreate();
                            if (e.key === 'Escape') {
                                setCreating(false);
                                setError(null);
                            }
                        }}
                    />
                    <button className="btn btn--accent" onClick={commitCreate}>
                        Create
                    </button>
                    <button
                        className="btn"
                        onClick={() => {
                            setCreating(false);
                            setError(null);
                        }}
                    >
                        Cancel
                    </button>
                    {error && <span className="field__error">{error}</span>}
                </div>
            )}
        </div>
    );
}

const isTerminal = (e: Effect) =>
    e.type === 'endDialogue' ||
    e.type === 'goToLocation' ||
    e.type === 'startDialogue';

function choiceTargetValue(choice: Choice): string {
    if (choice.next) return choice.next;
    const effects = choice.effects ?? [];
    if (
        effects.some((e) => e.type === 'endDialogue') &&
        !effects.some(
            (e) => e.type === 'goToLocation' || e.type === 'startDialogue'
        )
    ) {
        return '__end__';
    }
    return '';
}

function setChoiceTarget(choice: Choice, value: string): Choice {
    const kept = (choice.effects ?? []).filter((e) => !isTerminal(e));
    if (value === '__end__') {
        return {
            ...choice,
            next: '',
            effects: [...kept, { type: 'endDialogue' }],
        };
    }
    return {
        ...choice,
        next: value,
        effects: kept.length > 0 ? kept : undefined,
    };
}

function moveChoice(
    choices: Choice[],
    index: number,
    direction: -1 | 1
): Choice[] {
    const target = index + direction;
    if (
        index < 0 ||
        index >= choices.length ||
        target < 0 ||
        target >= choices.length
    ) {
        return choices;
    }
    const reordered = [...choices];
    [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
    ];
    return reordered;
}

export function NodeEditor({
    node,
    isStart,
    characters,
    nodeIds,
    registry,
    projectDir,
    onChange,
    onRename,
    onMakeStart,
    onDelete,
    onCreateNode,
    onPlayFromHere,
}: {
    node: DialogueNode;
    isStart: boolean;
    characters: string[];
    nodeIds: string[];
    registry: ContentRegistry;
    projectDir: string;
    onChange: (node: DialogueNode) => void;
    onRename: (oldId: string, newId: string) => void;
    onMakeStart: () => void;
    onDelete: () => void;
    /** Create a new node (without leaving this one) so a target can point at it. */
    onCreateNode: (id: string) => void;
    /** Open the playtest panel with the running session jumped to this node. */
    onPlayFromHere: () => void;
}) {
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'choice'; index: number }
        | { kind: 'branch'; index: number }
        | null
    >(null);
    const set = (patch: Partial<DialogueNode>) =>
        onChange({ ...node, ...patch });

    const speakerOptions =
        node.speaker && !characters.includes(node.speaker)
            ? [node.speaker, ...characters]
            : characters;

    const branches = node.conditionalBranches ?? [];
    const routesElsewhere = (choice: Choice) =>
        (choice.effects ?? []).some(
            (e) => e.type === 'goToLocation' || e.type === 'startDialogue'
        );
    return (
        <div className="node-editor">
            <div className="node-editor__head">
                <span className="node-editor__label">NODE</span>
                <NodeIdField
                    id={node.id}
                    nodeIds={nodeIds}
                    onRename={(newId) => onRename(node.id, newId)}
                />
                {isStart ? (
                    <span className="dlg__node-badge">start</span>
                ) : (
                    <button className="dlg__add" onClick={onMakeStart}>
                        Set as start
                    </button>
                )}
                <button
                    className="dlg__add"
                    onClick={onPlayFromHere}
                    title="Open the playtest at this node, keeping its current game state"
                >
                    <Play size={13} aria-hidden /> Play from here
                </button>
                <button
                    className="dlg__add node-editor__delete"
                    onClick={onDelete}
                >
                    Delete node
                </button>
            </div>

            <label className="field">
                <span className="field__label">Speaker</span>
                <select
                    className="dlg__select"
                    value={node.speaker ?? ''}
                    onChange={(e) => set({ speaker: e.target.value || null })}
                >
                    <option value="">Narrator</option>
                    {speakerOptions.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </label>

            <LocalizedTextField
                label={<span className="field__label">Line</span>}
                source={node.text}
                registry={registry}
                textKind="prose"
                placeholder="Write the line…"
                ariaLabel="Line"
                onSourceChange={(text) => set({ text })}
            />

            <div className="node-editor__grid">
                <AssetField
                    label="Voice"
                    name="Voice"
                    value={node.voice ?? ''}
                    projectDir={projectDir}
                    kind="voice"
                    onChange={(value) => set({ voice: value || undefined })}
                />
                <AssetField
                    label="Portrait"
                    name="Portrait"
                    value={node.portrait ?? ''}
                    projectDir={projectDir}
                    kind="portrait"
                    onChange={(value) => set({ portrait: value || undefined })}
                />
            </div>

            <div className="node-editor__section">
                <div className="node-editor__section-head">Node effects</div>
                <EffectList
                    effects={node.effects ?? []}
                    registry={registry}
                    projectDir={projectDir}
                    onChange={(effects) =>
                        set({ effects: effects.length ? effects : undefined })
                    }
                />
            </div>

            <div className="node-editor__section">
                <div className="node-editor__section-head">
                    Conditional (IF) branches
                    <button
                        className="dlg__add"
                        onClick={() =>
                            set({
                                conditionalBranches: [
                                    ...branches,
                                    {
                                        condition: {
                                            type: 'hasFlag',
                                            flag: 'flag',
                                        },
                                    },
                                ],
                            })
                        }
                    >
                        <Plus size={13} /> Branch
                    </button>
                </div>
                {branches.map((branch, i) => (
                    <div key={i} className="dlg__card">
                        <div className="dlg__card-head">
                            <span>IF</span>
                            <button
                                className="dlg__x"
                                aria-label="Remove branch"
                                onClick={() =>
                                    setDeleteTarget({
                                        kind: 'branch',
                                        index: i,
                                    })
                                }
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <SingleConditionField
                            condition={branch.condition}
                            registry={registry}
                            projectDir={projectDir}
                            onChange={(condition) => {
                                const next: ConditionalBranch = {
                                    ...branch,
                                    condition,
                                };
                                set({
                                    conditionalBranches: branches.map((b, j) =>
                                        j === i ? next : b
                                    ),
                                });
                            }}
                        />
                        <EffectList
                            effects={branch.effects ?? []}
                            registry={registry}
                            projectDir={projectDir}
                            onChange={(effects) =>
                                set({
                                    conditionalBranches: branches.map((b, j) =>
                                        j === i
                                            ? {
                                                  ...b,
                                                  effects: effects.length
                                                      ? effects
                                                      : undefined,
                                              }
                                            : b
                                    ),
                                })
                            }
                        />
                        <div className="dlg__target">
                            <span className="field__label">Goes to</span>
                            <TargetSelect
                                onCreateNode={onCreateNode}
                                value={branch.next ?? ''}
                                nodeIds={nodeIds}
                                onChange={(v) =>
                                    set({
                                        conditionalBranches: branches.map(
                                            (b, j) =>
                                                j === i
                                                    ? {
                                                          ...b,
                                                          next: v || undefined,
                                                      }
                                                    : b
                                        ),
                                    })
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="node-editor__section">
                <div className="node-editor__section-head">
                    Choices
                    <button
                        className="dlg__add"
                        onClick={() =>
                            set({
                                choices: [
                                    ...node.choices,
                                    {
                                        id: `${node.id}_choice_${node.choices.length}`,
                                        text: '@choice',
                                        next: nodeIds[0] ?? '',
                                    },
                                ],
                            })
                        }
                    >
                        <Plus size={13} /> Choice
                    </button>
                </div>
                {node.choices.map((choice, i) => {
                    const update = (next: Choice) =>
                        set({
                            choices: node.choices.map((c, j) =>
                                j === i ? next : c
                            ),
                        });
                    return (
                        <div key={choice.id} className="dlg__card">
                            <div className="dlg__card-head">
                                <span>CHOICE</span>
                                <div className="dlg__card-actions">
                                    <button
                                        className="dlg__move"
                                        aria-label="Move choice up"
                                        title="Move choice up"
                                        disabled={i === 0}
                                        onClick={() =>
                                            set({
                                                choices: moveChoice(
                                                    node.choices,
                                                    i,
                                                    -1
                                                ),
                                            })
                                        }
                                    >
                                        <ChevronUp size={15} />
                                    </button>
                                    <button
                                        className="dlg__move"
                                        aria-label="Move choice down"
                                        title="Move choice down"
                                        disabled={i === node.choices.length - 1}
                                        onClick={() =>
                                            set({
                                                choices: moveChoice(
                                                    node.choices,
                                                    i,
                                                    1
                                                ),
                                            })
                                        }
                                    >
                                        <ChevronDown size={15} />
                                    </button>
                                    <button
                                        className="dlg__x"
                                        aria-label="Remove choice"
                                        onClick={() =>
                                            setDeleteTarget({
                                                kind: 'choice',
                                                index: i,
                                            })
                                        }
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>
                            <LocalizedTextField
                                label={
                                    <span className="field__label">Text</span>
                                }
                                source={choice.text}
                                registry={registry}
                                textKind="single-line-wrap"
                                placeholder="Write the choice…"
                                ariaLabel={`Choice ${i + 1} text`}
                                onSourceChange={(text) =>
                                    update({ ...choice, text })
                                }
                            />
                            <div className="dlg__sub">Requirements</div>
                            <ConditionList
                                conditions={choice.conditions ?? []}
                                registry={registry}
                                projectDir={projectDir}
                                inRequire
                                onChange={(conditions) =>
                                    update({
                                        ...choice,
                                        conditions: conditions.length
                                            ? conditions
                                            : undefined,
                                    })
                                }
                            />
                            <div className="dlg__sub">Effects</div>
                            <EffectList
                                effects={choice.effects ?? []}
                                registry={registry}
                                projectDir={projectDir}
                                onChange={(effects) =>
                                    update({
                                        ...choice,
                                        effects: effects.length
                                            ? effects
                                            : undefined,
                                    })
                                }
                            />
                            <div className="dlg__target">
                                <span className="field__label">Goes to</span>
                                <TargetSelect
                                    onCreateNode={onCreateNode}
                                    value={choiceTargetValue(choice)}
                                    nodeIds={nodeIds}
                                    includeEnd
                                    onChange={(v) =>
                                        update(setChoiceTarget(choice, v))
                                    }
                                />
                            </div>
                            {routesElsewhere(choice) && (
                                <div className="dlg__note">
                                    Routes to a location or starts a dialogue.
                                    Changing the target replaces that. Edit in
                                    Source for full control.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="node-editor__section">
                <div className="dlg__target">
                    <span className="field__label">Next node</span>
                    <TargetSelect
                        onCreateNode={onCreateNode}
                        value={node.next ?? ''}
                        nodeIds={nodeIds}
                        onChange={(v) => set({ next: v || undefined })}
                    />
                </div>
            </div>
            {deleteTarget && (
                <ConfirmModal
                    title={
                        deleteTarget.kind === 'choice'
                            ? 'Delete this choice?'
                            : 'Delete this conditional branch?'
                    }
                    message={
                        deleteTarget.kind === 'choice'
                            ? 'This removes the choice text, requirements, effects, and destination.'
                            : 'This removes the branch condition, effects, and destination.'
                    }
                    confirmLabel={
                        deleteTarget.kind === 'choice'
                            ? 'Delete choice'
                            : 'Delete branch'
                    }
                    danger
                    onConfirm={() => {
                        if (deleteTarget.kind === 'choice') {
                            set({
                                choices: node.choices.filter(
                                    (_, index) => index !== deleteTarget.index
                                ),
                            });
                        } else {
                            set({
                                conditionalBranches: branches.filter(
                                    (_, index) => index !== deleteTarget.index
                                ),
                            });
                        }
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
