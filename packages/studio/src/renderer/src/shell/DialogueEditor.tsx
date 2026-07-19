import { useEffect, useMemo, useRef, useState } from 'react';
import { TriangleAlert } from '../lib/icons';
import { parseDialogue, applyDialogueEdits } from '@doodle-engine/core';
import type { Dialogue, DialogueNode } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import { NodeEditor } from './NodeEditor';
import { authoredTextPreview } from '../lib/localized-text';
import { LocaleWriterBoundary, useLocaleWriter } from '../lib/locale-writer';
import { ConfirmModal } from './ConfirmModal';
import { ResizeHandle } from './ResizeHandle';
import { usePersistedSize } from '../lib/usePersistedSize';

/**
 * Visual editor for a .dlg file. It parses the file into a dialogue, edits that
 * model, and writes it back with applyDialogueEdits (which preserves comments
 * for content edits). A file that doesn't parse can't be shown visually — the
 * user is pointed to the Source view to fix it.
 */
interface DialogueEditorProps {
    project: OpenProject;
    tabKey: string;
    path: string;
    dialogueId: string;
    onDirty: (tabKey: string, dirty: boolean) => void;
    onModified: (filePath: string) => void;
    onPlayFromNode: (dialogueId: string, nodeId: string) => void;
}

export function DialogueEditor(props: DialogueEditorProps) {
    return (
        <LocaleWriterBoundary
            project={props.project}
            onModified={props.onModified}
        >
            <DialogueEditorInner {...props} />
        </LocaleWriterBoundary>
    );
}

function DialogueEditorInner({
    project,
    tabKey,
    path,
    dialogueId,
    onDirty,
    onModified,
    onPlayFromNode,
}: DialogueEditorProps) {
    const [base, setBase] = useState('');
    const [savedText, setSavedText] = useState('');
    const [mtimeMs, setMtimeMs] = useState(0);
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [parseError, setParseError] = useState<string | null>(null);
    const [conflict, setConflict] = useState<string | null>(null);
    const [missing, setMissing] = useState(false);
    const [deleteNodeId, setDeleteNodeId] = useState<string | null>(null);
    const [outlineWidth, setOutlineWidth] = usePersistedSize(
        'doodle-studio-dlg-outline-width',
        220
    );
    const localeWriter = useLocaleWriter();

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
    useEffect(() => {
        const handleSaveShortcut = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 's'
            ) {
                event.preventDefault();
                flushRef.current();
            }
        };
        window.addEventListener('keydown', handleSaveShortcut);
        return () => window.removeEventListener('keydown', handleSaveShortcut);
    }, []);

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

    // Create a node a target dropdown asked for, and jump to it so the author
    // can write its line right away. Functional update so it composes with the
    // choice edit that points at the new node in the same tick.
    const createNode = (id: string) => {
        setDialogue((d) =>
            d && !d.nodes.some((n) => n.id === id)
                ? {
                      ...d,
                      nodes: [
                          ...d.nodes,
                          { id, speaker: null, text: '', choices: [] },
                      ],
                  }
                : d
        );
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
    const displayedText = (source: string) => {
        if (!source.startsWith('@')) return source;
        const locale = localeWriter?.authoringLocale;
        const value = locale
            ? localeWriter?.files[locale]?.values[source.slice(1)]
            : undefined;
        return (
            value ??
            authoredTextPreview(source, project.registry)?.text ??
            source
        );
    };
    const routeImpact = deleteNodeId
        ? dialogue.nodes
              .filter((node) => node.id !== deleteNodeId)
              .reduce(
                  (impact, node) => ({
                      gotos:
                          impact.gotos + (node.next === deleteNodeId ? 1 : 0),
                      choices:
                          impact.choices +
                          node.choices.filter(
                              (choice) => choice.next === deleteNodeId
                          ).length,
                      branches:
                          impact.branches +
                          (node.conditionalBranches ?? []).filter(
                              (branch) => branch.next === deleteNodeId
                          ).length,
                  }),
                  { gotos: 0, choices: 0, branches: 0 }
              )
        : { gotos: 0, choices: 0, branches: 0 };
    const routeCount =
        routeImpact.gotos + routeImpact.choices + routeImpact.branches;

    return (
        <div
            className="dlg"
            style={{ gridTemplateColumns: `${outlineWidth}px auto 1fr` }}
        >
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
                        aria-label={node.id}
                        onClick={() => setSelectedId(node.id)}
                    >
                        <span className="dlg__node-id">{node.id}</span>
                        {node.id === dialogue.startNode && (
                            <span className="dlg__node-badge">start</span>
                        )}
                        <span className="dlg__node-preview">
                            {displayedText(node.text)}
                        </span>
                    </button>
                ))}
            </div>

            <ResizeHandle
                axis="x"
                size={outlineWidth}
                min={160}
                max={420}
                onResize={setOutlineWidth}
            />

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
                        onDelete={() => setDeleteNodeId(selected.id)}
                        onCreateNode={createNode}
                        onPlayFromHere={() =>
                            onPlayFromNode(dialogueId, selected.id)
                        }
                    />
                ) : (
                    <div className="editor__empty">
                        <span>This dialogue has no nodes.</span>
                    </div>
                )}
            </div>
            {deleteNodeId && (
                <ConfirmModal
                    title={`Delete node “${deleteNodeId}”?`}
                    message={
                        'This removes its line, choices, conditions, effects, and routing. ' +
                        (routeCount > 0
                            ? routeCount +
                              ' surviving route' +
                              (routeCount === 1 ? ' points' : 's point') +
                              ' here (' +
                              routeImpact.choices +
                              ' choice' +
                              (routeImpact.choices === 1 ? '' : 's') +
                              ', ' +
                              routeImpact.gotos +
                              ' node GOTO' +
                              (routeImpact.gotos === 1 ? '' : 's') +
                              ', ' +
                              routeImpact.branches +
                              ' branch' +
                              (routeImpact.branches === 1 ? '' : 'es') +
                              '); deleting will break those routes.'
                            : 'No surviving routes point here.')
                    }
                    confirmLabel="Delete node"
                    danger
                    onConfirm={() => {
                        deleteNode(deleteNodeId);
                        setDeleteNodeId(null);
                    }}
                    onCancel={() => setDeleteNodeId(null)}
                />
            )}
        </div>
    );
}
