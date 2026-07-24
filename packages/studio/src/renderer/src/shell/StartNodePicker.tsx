/**
 * A searchable, grouped picker for choosing a dialogue node to start the
 * playtest at. Projects can have many dialogues and nodes, so this filters as
 * you type (by dialogue id or node id) and groups nodes under their dialogue,
 * with the start node marked — rather than one long flat list.
 */
import { useMemo, useState } from 'react';
import type { ContentRegistry } from '@doodle-engine/core';
import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

export interface NodeTarget {
    dialogueId: string;
    nodeId: string;
    isStart: boolean;
}

export function StartNodePicker({
    registry,
    onPick,
    onCancel,
}: {
    registry: ContentRegistry;
    onPick: (target: NodeTarget) => void;
    onCancel: () => void;
}) {
    useModalDismiss(onCancel);
    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return Object.values(registry.dialogues)
            .map((dialogue) => {
                const dialogueMatches = dialogue.id.toLowerCase().includes(q);
                const nodes = dialogue.nodes
                    .map((node) => ({
                        dialogueId: dialogue.id,
                        nodeId: node.id,
                        isStart: node.id === dialogue.startNode,
                    }))
                    // When the dialogue name matches, keep all its nodes;
                    // otherwise keep only nodes whose id matches.
                    .filter(
                        (n) =>
                            q === '' ||
                            dialogueMatches ||
                            n.nodeId.toLowerCase().includes(q)
                    )
                    // Start node first within each dialogue.
                    .sort((a, b) => (a.isStart ? -1 : b.isStart ? 1 : 0));
                return { dialogueId: dialogue.id, nodes };
            })
            .filter((g) => g.nodes.length > 0);
    }, [registry, query]);

    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div
                    className="modal modal--tall"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal__title">Start at node</div>
                    <input
                        className="field__input"
                        placeholder="Search dialogues and nodes…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        spellCheck={false}
                        aria-label="Search dialogues and nodes"
                    />
                    <div className="nodepick scroll">
                        {groups.length === 0 ? (
                            <div className="dock__empty">No nodes match.</div>
                        ) : (
                            groups.map((group) => (
                                <div
                                    key={group.dialogueId}
                                    className="nodepick__group"
                                >
                                    <div className="nodepick__dialogue mono">
                                        {group.dialogueId}
                                    </div>
                                    {group.nodes.map((node) => (
                                        <button
                                            key={node.nodeId}
                                            className="nodepick__node"
                                            onClick={() => onPick(node)}
                                        >
                                            <span className="mono">
                                                {node.nodeId}
                                            </span>
                                            {node.isStart && (
                                                <span className="nodepick__start">
                                                    start
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="modal__actions">
                        <button className="btn" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
}
