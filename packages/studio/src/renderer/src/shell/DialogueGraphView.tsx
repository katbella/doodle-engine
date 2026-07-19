import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDialogue, serializeCondition } from '@doodle-engine/core';
import type { Dialogue } from '@doodle-engine/core';
import type { OpenProject } from '../../../shared/project';
import { Pencil } from '../lib/icons';
import { authoredTextPreview } from '../lib/localized-text';
import { useLocaleWriter } from '../lib/locale-writer';
import {
    edgePath,
    layoutDialogue,
    NODE_W,
    type GraphNode,
    type GraphRow,
} from '../lib/dialogue-graph';

/**
 * Read-only graph of a .dlg file. Nodes list their outgoing routes as rows
 * (choice text, IF conditions, GOTO), each row anchoring its own edge, and
 * routes that loop back to an earlier node show a return chip instead of a
 * line. Click selects a node (shared with the Visual editor's outline);
 * the pencil button or a double-click opens it in the Visual editor.
 *
 * The whole scene lives in one transformed <g>; the camera is a ref written
 * straight to that transform (batched per frame), so zoom and pan gestures
 * never re-render the React tree.
 */
interface DialogueGraphViewProps {
    project: OpenProject;
    path: string;
    dialogueId: string;
    selectedNodeId: string | null;
    onSelectNode: (nodeId: string) => void;
    onOpenNode: (nodeId: string) => void;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const FIT_PADDING = 60;
/** Pointer travel below this is a click on whatever was under the pointer. */
const DRAG_THRESHOLD = 4;

interface Camera {
    x: number;
    y: number;
    k: number;
}

export function DialogueGraphView({
    project,
    path,
    dialogueId,
    selectedNodeId,
    onSelectNode,
    onOpenNode,
}: DialogueGraphViewProps) {
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [loading, setLoading] = useState(true);
    const [parseError, setParseError] = useState<string | null>(null);
    const localeWriter = useLocaleWriter();

    const svgRef = useRef<SVGSVGElement>(null);
    const sceneRef = useRef<SVGGElement>(null);
    const cameraRef = useRef<Camera>({ x: 0, y: 0, k: 1 });
    const frameRef = useRef(0);
    const dragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        cameraX: number;
        cameraY: number;
        moved: boolean;
        nodeId: string | null;
    } | null>(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setParseError(null);
        (async () => {
            try {
                const doc = await window.studio.readDocument(
                    project.projectDir,
                    path
                );
                if (!alive) return;
                try {
                    setDialogue(parseDialogue(doc.content, dialogueId));
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
    }, [project.projectDir, path, dialogueId]);

    const graph = useMemo(
        () => (dialogue ? layoutDialogue(dialogue) : null),
        [dialogue]
    );
    // Tab order follows the visual layout, column by column.
    const orderedNodes = useMemo(
        () =>
            graph
                ? [...graph.nodes].sort((a, b) => a.x - b.x || a.y - b.y)
                : [],
        [graph]
    );

    const applyCamera = () => {
        const { x, y, k } = cameraRef.current;
        sceneRef.current?.setAttribute(
            'transform',
            `translate(${x} ${y}) scale(${k})`
        );
    };
    const scheduleCamera = () => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(applyCamera);
    };
    useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

    // Start at fit-to-content with padding, centered.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || !graph) return;
        const rect = svg.getBoundingClientRect();
        const k = Math.min(
            1,
            Math.max(
                MIN_ZOOM,
                Math.min(
                    (rect.width - FIT_PADDING * 2) / Math.max(1, graph.width),
                    (rect.height - FIT_PADDING * 2) / Math.max(1, graph.height)
                )
            )
        );
        cameraRef.current = {
            x: (rect.width - graph.width * k) / 2,
            y: (rect.height - graph.height * k) / 2,
            k,
        };
        applyCamera();
    }, [graph]);

    // Native wheel listener: React registers wheel passively, and zoom must
    // preventDefault so the page doesn't scroll. Ctrl+wheel is how touchpad
    // pinch arrives, and it's the same gesture here.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = svg.getBoundingClientRect();
            const cx = event.clientX - rect.left;
            const cy = event.clientY - rect.top;
            const camera = cameraRef.current;
            const factor = Math.exp(-event.deltaY * 0.0016);
            const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.k * factor));
            // Keep the world point under the cursor fixed while scaling.
            const scale = k / camera.k;
            cameraRef.current = {
                x: cx - (cx - camera.x) * scale,
                y: cy - (cy - camera.y) * scale,
                k,
            };
            scheduleCamera();
        };
        svg.addEventListener('wheel', onWheel, { passive: false });
        return () => svg.removeEventListener('wheel', onWheel);
    }, [graph]);

    const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;
        const target = event.target as Element;
        // Best-effort: keeps the pan alive when the pointer leaves the SVG.
        try {
            svgRef.current?.setPointerCapture(event.pointerId);
        } catch {
            // Synthetic events have no active pointer to capture.
        }
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            cameraX: cameraRef.current.x,
            cameraY: cameraRef.current.y,
            moved: false,
            nodeId:
                target
                    .closest('[data-node-id]')
                    ?.getAttribute('data-node-id') ?? null,
        };
    };
    const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.moved = true;
        cameraRef.current = {
            ...cameraRef.current,
            x: drag.cameraX + dx,
            y: drag.cameraY + dy,
        };
        scheduleCamera();
    };
    const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (!drag.moved && drag.nodeId) onSelectNode(drag.nodeId);
    };

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

    const rowLabel = (n: GraphNode, row: GraphRow): string => {
        if (row.kind === 'choice') {
            return displayedText(n.node!.choices[row.index].text);
        }
        if (row.kind === 'branch') {
            const branch = n.node!.conditionalBranches![row.index];
            return `IF ${serializeCondition(branch.condition)}`;
        }
        return 'GOTO';
    };

    if (loading) {
        return (
            <div className="editor__empty">
                <span className="spinner" />
                Loading…
            </div>
        );
    }
    if (parseError || !graph) {
        return (
            <div className="editor__empty">
                <span>
                    This dialogue has a syntax error and can’t be shown as a
                    graph.
                </span>
                <span className="editor__empty-hint">
                    Switch to Source to fix it: {parseError}
                </span>
            </div>
        );
    }
    if (!graph.nodes.length) {
        return (
            <div className="editor__empty">
                <span>This dialogue has no nodes.</span>
            </div>
        );
    }

    return (
        <svg
            ref={svgRef}
            className="graph"
            role="application"
            aria-label={`Graph of ${dialogueId}. Drag to pan, scroll to zoom, click a node to select it, double-click to open it in the Visual editor.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (dragRef.current = null)}
        >
            <defs>
                <marker
                    id="graph-arrow"
                    className="graph__arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3"
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                >
                    <path d="M0,0 L6,3 L0,6 Z" />
                </marker>
            </defs>
            <g ref={sceneRef}>
                {graph.edges.map((edge, i) => (
                    <path
                        key={i}
                        className={`graph__edge graph__edge--${edge.kind}`}
                        d={edgePath(edge)}
                        markerEnd="url(#graph-arrow)"
                    />
                ))}
                {orderedNodes.map((n) => {
                    const classes = [
                        'graph__node',
                        n.node === null && 'graph__node--ghost',
                        n.unreachable &&
                            !n.isStart &&
                            'graph__node--unreachable',
                        n.id === selectedNodeId && 'graph__node--selected',
                        n.isStart && 'graph__node--start',
                    ]
                        .filter(Boolean)
                        .join(' ');
                    return (
                        <g
                            key={n.id}
                            className={classes}
                            data-node-id={n.id}
                            transform={`translate(${n.x} ${n.y})`}
                            tabIndex={0}
                            role="button"
                            aria-label={`Select node ${n.id}`}
                            onDoubleClick={() => {
                                if (n.node) onOpenNode(n.id);
                            }}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    onSelectNode(n.id);
                                }
                            }}
                        >
                            <rect
                                className="graph__node-box"
                                width={NODE_W}
                                height={n.h}
                            />
                            <foreignObject
                                width={NODE_W}
                                height={n.h}
                                className="graph__node-body"
                            >
                                <div className="graph__node-inner">
                                    <div className="graph__node-head">
                                        <span className="graph__node-id">
                                            {n.id}
                                        </span>
                                        {n.isStart && (
                                            <span className="graph__badge graph__badge--start">
                                                start
                                            </span>
                                        )}
                                        {n.isEnd && n.node && (
                                            <span className="graph__badge">
                                                end
                                            </span>
                                        )}
                                        {n.node && (
                                            <button
                                                className="graph__node-open"
                                                aria-label={`Open node ${n.id} in the Visual editor`}
                                                onPointerDown={(event) =>
                                                    event.stopPropagation()
                                                }
                                                onClick={() => onOpenNode(n.id)}
                                            >
                                                <Pencil size={12} aria-hidden />
                                            </button>
                                        )}
                                    </div>
                                    <span className="graph__node-preview">
                                        {n.node === null
                                            ? 'No node has this id'
                                            : (n.node.speaker
                                                  ? n.node.speaker + ': '
                                                  : '') +
                                              displayedText(n.node.text)}
                                    </span>
                                    {n.rows.length > 0 && (
                                        <div className="graph__rows">
                                            {n.rows.map((row, i) => (
                                                <div
                                                    key={i}
                                                    className={`graph__row graph__row--${row.kind}`}
                                                >
                                                    <span className="graph__row-label">
                                                        {rowLabel(n, row)}
                                                    </span>
                                                    {row.target === null && (
                                                        <span className="graph__chip graph__chip--end">
                                                            END
                                                        </span>
                                                    )}
                                                    {row.back && (
                                                        <span className="graph__chip">
                                                            ↩ {row.target}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
