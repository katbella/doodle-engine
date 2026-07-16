import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert } from '../lib/icons';
import { parseDialogue, applyDialogueEdits } from '@doodle-engine/core';
import type { Dialogue, DialogueNode } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import { NodeEditor } from './NodeEditor';

/**
 * Visual editor for a .dlg file. It parses the file into a dialogue, edits that
 * model, and writes it back with applyDialogueEdits (which preserves comments
 * for content edits). A file that doesn't parse can't be shown visually — the
 * user is pointed to the Source view to fix it.
 */
export function DialogueEditor({
    project,
    tabKey,
    path,
    dialogueId,
    onDirty,
    onModified,
}: {
    project: OpenProject;
    tabKey: string;
    path: string;
    dialogueId: string;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
}) {
    const [base, setBase] = useState('');
    const [savedText, setSavedText] = useState('');
    const [mtimeMs, setMtimeMs] = useState(0);
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [parseError, setParseError] = useState<string | null>(null);
    const [conflict, setConflict] = useState<string | null>(null);
    const [missing, setMissing] = useState(false);

    const dir = project.projectDir;

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setParseError(null);
        setConflict(null);
        (async () => {
            try {
                const doc = await window.studio.readDocument(dir, path);
                if (!alive) return;
                setBase(doc.content);
                setSavedText(doc.content);
                setMtimeMs(doc.mtimeMs);
                try {
                    const parsed = parseDialogue(doc.content, dialogueId);
                    setDialogue(parsed);
                    setSelectedId(parsed.nodes[0]?.id ?? null);
                } catch (e) {
                    setDialogue(null);
                    setParseError(e instanceof Error ? e.message : String(e));
                }
            } catch (e) {
                if (alive)
                    setParseError(e instanceof Error ? e.message : String(e));
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [dir, path, dialogueId]);

    const currentText = useMemo(() => {
        if (!dialogue) return savedText;
        // A bare CHOICE line isn't valid .dlg, so an empty label is written as
        // the "@choice" placeholder for validation to flag.
        const forSave: Dialogue = {
            ...dialogue,
            nodes: dialogue.nodes.map((n) => ({
                ...n,
                choices: n.choices.map((c) =>
                    c.text.trim() ? c : { ...c, text: '@choice' }
                ),
            })),
        };
        return applyDialogueEdits(base, dialogueId, forSave);
    }, [base, dialogueId, dialogue, savedText]);
    const dirty = currentText !== savedText;
    useEffect(() => onDirty(tabKey, dirty), [dirty, tabKey, onDirty]);

    const save = async (force = false) => {
        const result = await window.studio.writeDocument(
            dir,
            path,
            currentText,
            force ? undefined : mtimeMs
        );
        if (result.conflict) {
            if (result.missing) {
                setMissing(true);
            } else {
                setConflict(result.content ?? '');
            }
            setMtimeMs(result.mtimeMs);
        } else if (result.ok) {
            setSavedText(currentText);
            setBase(currentText);
            setMtimeMs(result.mtimeMs);
            setConflict(null);
            setMissing(false);
            onModified(path);
        }
    };

    // Autosave a short while after the last edit.
    useEffect(() => {
        if (!dirty || conflict !== null || missing) return;
        const t = setTimeout(() => void save(), 1000);
        return () => clearTimeout(t);
    }, [currentText, dirty, conflict, missing]);

    // Save any pending edit when this editor goes away (closing the tab,
    // switching views, or opening another project), so a quick edit followed
    // by navigation still lands on disk.
    const flushRef = useRef(() => {});
    flushRef.current = () => {
        if (dirty && conflict === null && !missing) void save();
    };
    useEffect(() => () => flushRef.current(), []);

    const updateNode = (updated: DialogueNode) => {
        setDialogue((d) =>
            d
                ? {
                      ...d,
                      nodes: d.nodes.map((n) =>
                          n.id === updated.id ? updated : n
                      ),
                  }
                : d
        );
    };

    const addNode = () => {
        if (!dialogue) return;
        const ids = new Set(dialogue.nodes.map((n) => n.id));
        let id = 'new_node';
        for (let n = 2; ids.has(id); n++) id = `new_node_${n}`;
        setDialogue({
            ...dialogue,
            nodes: [
                ...dialogue.nodes,
                { id, speaker: null, text: '@text', choices: [] },
            ],
        });
        setSelectedId(id);
    };

    const deleteNode = (id: string) => {
        if (!dialogue) return;
        const nodes = dialogue.nodes.filter((n) => n.id !== id);
        setDialogue({
            ...dialogue,
            nodes,
            startNode:
                dialogue.startNode === id
                    ? (nodes[0]?.id ?? '')
                    : dialogue.startNode,
        });
        setSelectedId(nodes[0]?.id ?? null);
    };

    // The start node is whichever node comes first in the file, so making a node
    // the start means moving it to the front.
    const makeStart = (id: string) => {
        if (!dialogue || dialogue.startNode === id) return;
        const node = dialogue.nodes.find((n) => n.id === id);
        if (!node) return;
        setDialogue({
            ...dialogue,
            nodes: [node, ...dialogue.nodes.filter((n) => n.id !== id)],
            startNode: id,
        });
    };

    // Rename a node and repoint every GOTO target (node next, choice next, IF
    // branch next) and the start node that referred to the old id.
    const renameNode = (oldId: string, newId: string) => {
        if (!dialogue || oldId === newId) return;
        const to = (target?: string) => (target === oldId ? newId : target);
        const nodes = dialogue.nodes.map((n) => ({
            ...n,
            id: n.id === oldId ? newId : n.id,
            next: to(n.next),
            choices: n.choices.map((c) => ({ ...c, next: to(c.next) ?? '' })),
            conditionalBranches: n.conditionalBranches?.map((b) => ({
                ...b,
                next: to(b.next),
            })),
        }));
        setDialogue({
            ...dialogue,
            nodes,
            startNode:
                dialogue.startNode === oldId ? newId : dialogue.startNode,
        });
        setSelectedId(newId);
    };

    if (loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" />
                Loading…
            </div>
        );
    }
    if (parseError || !dialogue) {
        return (
            <div className="editor__empty">
                <span>
                    This dialogue has a syntax error and can’t be shown
                    visually.
                </span>
                <span className="editor__empty-hint">
                    Switch to Source to fix it: {parseError}
                </span>
            </div>
        );
    }

    const selected = dialogue.nodes.find((n) => n.id === selectedId) ?? null;

    return (
        <div className="dlg">
            <div className="dlg__outline scroll">
                <div className="dlg__outline-head">
                    <span>Nodes</span>
                    <button className="dlg__add" onClick={addNode}>
                        + Node
                    </button>
                </div>
                {dialogue.nodes.map((node) => (
                    <button
                        key={node.id}
                        className={`dlg__node ${node.id === selectedId ? 'dlg__node--active' : ''}`}
                        onClick={() => setSelectedId(node.id)}
                    >
                        <span className="dlg__node-id">{node.id}</span>
                        {node.id === dialogue.startNode && (
                            <span className="dlg__node-badge">start</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="dlg__main scroll">
                {conflict !== null && (
                    <div className="banner">
                        <TriangleAlert
                            className="banner__icon"
                            size={15}
                            aria-hidden
                        />
                        <span>
                            This file changed on disk since you opened it.
                        </span>
                        <button className="btn" onClick={() => save(true)}>
                            Overwrite
                        </button>
                    </div>
                )}
                {missing && (
                    <div className="banner">
                        <TriangleAlert
                            className="banner__icon"
                            size={15}
                            aria-hidden
                        />
                        <span>This file was deleted outside Studio.</span>
                        <button className="btn" onClick={() => save(true)}>
                            Recreate it
                        </button>
                    </div>
                )}
                {selected ? (
                    <NodeEditor
                        node={selected}
                        isStart={selected.id === dialogue.startNode}
                        characters={Object.keys(project.registry.characters)}
                        nodeIds={dialogue.nodes.map((n) => n.id)}
                        registry={project.registry}
                        projectDir={project.projectDir}
                        onChange={updateNode}
                        onRename={renameNode}
                        onMakeStart={() => makeStart(selected.id)}
                        onDelete={() => deleteNode(selected.id)}
                    />
                ) : (
                    <div className="editor__empty">
                        <span>This dialogue has no nodes.</span>
                    </div>
                )}
            </div>
        </div>
    );
}
