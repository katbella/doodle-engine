import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Plus } from '../lib/icons';
import { serializeCondition, serializeEffect } from '@doodle-engine/core';
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

/** Editable node id. Commits on blur if the new id is non-empty, has no spaces,
 * and doesn't collide with another node. */
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
    const [invalid, setInvalid] = useState(false);
    useEffect(() => {
        setText(id);
        setInvalid(false);
    }, [id]);

    const commit = () => {
        const value = text.trim();
        const ok =
            value !== '' &&
            !/\s/.test(value) &&
            (value === id || !nodeIds.includes(value));
        setInvalid(!ok);
        if (ok && value !== id) onRename(value);
    };

    return (
        <input
            className={`dlg__input mono node-editor__id-input ${invalid ? 'dlg__input--invalid' : ''}`}
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            title="Node id (used by GOTO targets)"
        />
    );
}

/** Anchored popover with a click-away backdrop, for the builder. */
/**
 * A popover that floats above everything, anchored to the element that opened
 * it. It is rendered in a fixed overlay (not inside the scrolling node editor),
 * so it is never clipped, and it is capped to the viewport height so its own
 * content scrolls when the window is short. It opens below the anchor, or above
 * when there isn't room below.
 */
function Popover({
    anchorRef,
    children,
    onClose,
}: {
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{
        left: number;
        top: number;
        maxHeight: number;
    } | null>(null);

    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        const panel = panelRef.current;
        if (!anchor || !panel) return;

        const place = () => {
            const a = anchor.getBoundingClientRect();
            const margin = 8;
            const panelHeight = panel.offsetHeight;
            const below = window.innerHeight - a.bottom - margin;
            const above = a.top - margin;
            // Prefer below; flip above only if below is too small and above is roomier.
            const openAbove = below < panelHeight && above > below;
            const maxHeight = Math.max(160, openAbove ? above : below);
            const top = openAbove
                ? Math.max(
                      margin,
                      a.top - Math.min(panelHeight, maxHeight) - margin
                  )
                : a.bottom + margin;
            const left = Math.min(
                a.left,
                window.innerWidth - panel.offsetWidth - margin
            );
            setPos({ left: Math.max(margin, left), top, maxHeight });
        };

        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [anchorRef]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <>
            <div className="popover-backdrop" onClick={onClose} />
            <div
                ref={panelRef}
                className="popover"
                style={
                    pos
                        ? {
                              left: pos.left,
                              top: pos.top,
                              maxHeight: pos.maxHeight,
                          }
                        : { visibility: 'hidden' }
                }
            >
                {children}
            </div>
        </>
    );
}

/** A single required condition (used by IF branches), edited via the builder. */
function SingleConditionField({
    condition,
    registry,
    onChange,
}: {
    condition: Condition;
    registry: ContentRegistry;
    onChange: (condition: Condition) => void;
}) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    return (
        <div className="popover-anchor">
            <button
                ref={anchorRef}
                className="dlg__chip mono"
                onClick={() => setOpen(true)}
                title="Edit condition"
            >
                {serializeCondition(condition)}
            </button>
            {open && (
                <Popover anchorRef={anchorRef} onClose={() => setOpen(false)}>
                    <ConditionEffectBuilder
                        mode="condition"
                        registry={registry}
                        initial={condition}
                        onCommit={(entity) => {
                            onChange(entity as Condition);
                            setOpen(false);
                        }}
                        onCancel={() => setOpen(false)}
                    />
                </Popover>
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
                {label}
            </button>
            <button className="dlg__x" onClick={onRemove} aria-label="Remove">
                <X size={15} />
            </button>
        </div>
    );
}

function EffectList({
    effects,
    registry,
    onChange,
}: {
    effects: Effect[];
    registry: ContentRegistry;
    onChange: (effects: Effect[]) => void;
}) {
    // `null` = closed; a number = editing that row; -1 = adding a new one.
    const [open, setOpen] = useState<number | null>(null);
    const addRef = useRef<HTMLButtonElement>(null);

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
            <div className="popover-anchor">
                <button
                    ref={addRef}
                    className="dlg__add"
                    onClick={() => setOpen(-1)}
                >
                    <Plus size={13} /> Add effect
                </button>
                {open !== null && (
                    <Popover anchorRef={addRef} onClose={() => setOpen(null)}>
                        <ConditionEffectBuilder
                            mode="effect"
                            registry={registry}
                            initial={open >= 0 ? effects[open] : undefined}
                            onCommit={commit}
                            onCancel={() => setOpen(null)}
                        />
                    </Popover>
                )}
            </div>
        </div>
    );
}

function ConditionList({
    conditions,
    registry,
    inRequire = false,
    onChange,
}: {
    conditions: Condition[];
    registry: ContentRegistry;
    /** True inside a choice's Requirements, where `roll` is rejected. */
    inRequire?: boolean;
    onChange: (conditions: Condition[]) => void;
}) {
    const [open, setOpen] = useState<number | null>(null);
    const addRef = useRef<HTMLButtonElement>(null);

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
            <div className="popover-anchor">
                <button
                    ref={addRef}
                    className="dlg__add"
                    onClick={() => setOpen(-1)}
                >
                    <Plus size={13} /> Add{' '}
                    {inRequire ? 'requirement' : 'condition'}
                </button>
                {open !== null && (
                    <Popover anchorRef={addRef} onClose={() => setOpen(null)}>
                        <ConditionEffectBuilder
                            mode="condition"
                            registry={registry}
                            inRequire={inRequire}
                            initial={open >= 0 ? conditions[open] : undefined}
                            onCommit={commit}
                            onCancel={() => setOpen(null)}
                        />
                    </Popover>
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
}: {
    value: string;
    nodeIds: string[];
    includeEnd?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <select
            className="dlg__select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">— none —</option>
            {includeEnd && <option value="__end__">end dialogue</option>}
            {nodeIds.map((id) => (
                <option key={id} value={id}>
                    {id}
                </option>
            ))}
        </select>
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
}) {
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

            <label className="field">
                <span className="field__label">Line</span>
                <input
                    className="dlg__input mono"
                    value={node.text}
                    placeholder="@locale.key or plain text"
                    spellCheck={false}
                    onChange={(e) => set({ text: e.target.value })}
                />
            </label>

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
                                    set({
                                        conditionalBranches: branches.filter(
                                            (_, j) => j !== i
                                        ),
                                    })
                                }
                            >
                                <X size={15} />
                            </button>
                        </div>
                        <SingleConditionField
                            condition={branch.condition}
                            registry={registry}
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
                                <button
                                    className="dlg__x"
                                    aria-label="Remove choice"
                                    onClick={() =>
                                        set({
                                            choices: node.choices.filter(
                                                (_, j) => j !== i
                                            ),
                                        })
                                    }
                                >
                                    <X size={15} />
                                </button>
                            </div>
                            <input
                                className="dlg__input mono"
                                value={choice.text}
                                placeholder="@choice.key or plain text"
                                spellCheck={false}
                                onChange={(e) =>
                                    update({ ...choice, text: e.target.value })
                                }
                            />
                            <div className="dlg__sub">Requirements</div>
                            <ConditionList
                                conditions={choice.conditions ?? []}
                                registry={registry}
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
                                    Routes to a location or starts a dialogue —
                                    changing the target replaces that. Edit in
                                    Source for full control.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="node-editor__section">
                <div className="dlg__target">
                    <span className="field__label">Default next</span>
                    <TargetSelect
                        value={node.next ?? ''}
                        nodeIds={nodeIds}
                        onChange={(v) => set({ next: v || undefined })}
                    />
                </div>
            </div>
        </div>
    );
}
