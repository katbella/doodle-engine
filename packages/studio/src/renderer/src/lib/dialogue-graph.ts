import type { Dialogue, DialogueNode } from '@doodle-engine/core';

/**
 * Pure layout for the read-only dialogue graph. Turns a parsed Dialogue into
 * positioned nodes and routed edges; no DOM access so it stays unit-testable.
 *
 * Each node renders its outgoing routes (choices, IF branches, GOTO) as rows
 * inside the box, and a forward edge leaves from its row, so the meaning of
 * every line is readable at its source. Layered left-to-right: a node's
 * column is its BFS depth from the start node. Routes that target an
 * equal-or-earlier column are "back" routes — hub dialogues loop constantly —
 * and drawing them as long arcs buries the structure, so they get no line at
 * all; the row shows a small return chip naming the target instead. Nodes
 * with no path from the start are laid out the same way in trailing columns
 * so authors can spot them.
 */

export const NODE_W = 220;
export const HEADER_H = 44;
export const ROW_H = 24;
const PAD_BOTTOM = 5;
const RANK_GAP = 96;
const NODE_GAP = 26;
const COL_STEP = NODE_W + RANK_GAP;

export type GraphRowKind = 'choice' | 'branch' | 'goto';

export interface GraphRow {
    kind: GraphRowKind;
    /** Index into node.choices / node.conditionalBranches (0 for goto). */
    index: number;
    /** Route target id, or null when the route ends the dialogue. */
    target: string | null;
    /** Targets an equal-or-earlier column: drawn as a chip, not a line. */
    back: boolean;
}

export interface GraphNode {
    id: string;
    x: number;
    y: number;
    h: number;
    /** The parsed node, or null for a ghost (a route points at a missing id). */
    node: DialogueNode | null;
    rows: GraphRow[];
    isStart: boolean;
    /** No outgoing routes at all — the dialogue always ends here. */
    isEnd: boolean;
    /** No path from the start node reaches this node. */
    unreachable: boolean;
}

export interface GraphEdge {
    from: string;
    /** Row on the source node this edge leaves from. */
    row: number;
    to: string;
    kind: GraphRowKind;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export interface DialogueGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    width: number;
    height: number;
}

const nodeHeight = (rows: GraphRow[]): number =>
    HEADER_H + rows.length * ROW_H + (rows.length ? PAD_BOTTOM : 0);

function nodeRows(node: DialogueNode): GraphRow[] {
    const rows: GraphRow[] = node.choices.map((choice, index) => ({
        kind: 'choice' as const,
        index,
        target: choice.next || null,
        back: false,
    }));
    (node.conditionalBranches ?? []).forEach((branch, index) =>
        rows.push({
            kind: 'branch',
            index,
            target: branch.next || null,
            back: false,
        })
    );
    if (node.next) {
        rows.push({ kind: 'goto', index: 0, target: node.next, back: false });
    }
    return rows;
}

export function layoutDialogue(dialogue: Dialogue): DialogueGraph {
    const byId = new Map(dialogue.nodes.map((n) => [n.id, n]));
    const rowsById = new Map(dialogue.nodes.map((n) => [n.id, nodeRows(n)]));

    const allIds = [...byId.keys()];
    const ghostIds = new Set<string>();
    for (const rows of rowsById.values()) {
        for (const row of rows) {
            if (row.target && !byId.has(row.target)) {
                ghostIds.add(row.target);
            }
        }
    }
    for (const id of ghostIds) {
        allIds.push(id);
        rowsById.set(id, []);
    }

    const outgoing = new Map<string, string[]>(
        allIds.map((id) => [
            id,
            rowsById
                .get(id)!
                .flatMap((row) => (row.target ? [row.target] : [])),
        ])
    );

    // Column = BFS depth. First from the start node, then from each still
    // unranked node in file order so unreachable clusters land in trailing
    // columns with the same layered shape.
    const rank = new Map<string, number>();
    const bfs = (root: string, base: number): number => {
        let max = base;
        rank.set(root, base);
        const queue = [root];
        while (queue.length) {
            const id = queue.shift()!;
            const next = rank.get(id)! + 1;
            for (const to of outgoing.get(id) ?? []) {
                if (rank.has(to)) continue;
                rank.set(to, next);
                max = Math.max(max, next);
                queue.push(to);
            }
        }
        return max;
    };
    let maxRank = -1;
    if (byId.has(dialogue.startNode)) {
        maxRank = bfs(dialogue.startNode, 0);
    }
    const reachable = new Set(rank.keys());
    for (const id of allIds) {
        if (!rank.has(id)) maxRank = bfs(id, maxRank + 1);
    }

    for (const [id, rows] of rowsById) {
        for (const row of rows) {
            row.back =
                row.target !== null && rank.get(row.target)! <= rank.get(id)!;
        }
    }

    // Order within a column starts in rank-assignment order, then one
    // barycenter sweep in each direction pulls nodes toward the average
    // position of their neighbors to reduce edge crossings.
    const columns: string[][] = Array.from({ length: maxRank + 1 }, () => []);
    for (const id of allIds) columns[rank.get(id)!].push(id);

    const incoming = new Map<string, string[]>(allIds.map((id) => [id, []]));
    for (const [id, targets] of outgoing) {
        for (const to of targets) incoming.get(to)!.push(id);
    }
    const rowOf = new Map<string, number>();
    const setRows = (column: string[]) =>
        column.forEach((id, row) => rowOf.set(id, row));
    columns.forEach(setRows);
    const sweep = (
        neighbors: Map<string, string[]>,
        order: 'down' | 'up'
    ): void => {
        const range = [...columns.keys()];
        for (const c of order === 'down' ? range : range.reverse()) {
            const column = columns[c];
            const key = (id: string): number => {
                const adjacent = (neighbors.get(id) ?? []).filter(
                    (n) => rank.get(n) === (order === 'down' ? c - 1 : c + 1)
                );
                if (!adjacent.length) return rowOf.get(id)!;
                return (
                    adjacent.reduce((sum, n) => sum + rowOf.get(n)!, 0) /
                    adjacent.length
                );
            };
            column.sort((a, b) => key(a) - key(b));
            setRows(column);
        }
    };
    sweep(incoming, 'down');
    sweep(outgoing, 'up');

    // Stack each column, centered against the tallest column.
    const columnHeight = (column: string[]): number =>
        column.reduce((sum, id) => sum + nodeHeight(rowsById.get(id)!), 0) +
        Math.max(0, column.length - 1) * NODE_GAP;
    const height = Math.max(0, ...columns.map(columnHeight));
    const pos = new Map<string, { x: number; y: number }>();
    columns.forEach((column, c) => {
        let y = (height - columnHeight(column)) / 2;
        for (const id of column) {
            pos.set(id, { x: c * COL_STEP, y });
            y += nodeHeight(rowsById.get(id)!) + NODE_GAP;
        }
    });

    const nodes: GraphNode[] = allIds.map((id) => {
        const rows = rowsById.get(id)!;
        return {
            id,
            ...pos.get(id)!,
            h: nodeHeight(rows),
            node: byId.get(id) ?? null,
            rows,
            isStart: id === dialogue.startNode,
            isEnd: byId.has(id) && outgoing.get(id)!.length === 0,
            unreachable: !reachable.has(id),
        };
    });

    // Forward edges leave the right border at their row's center and land on
    // the target's left border inside the header band, fanned so parallel
    // arrivals don't stack.
    const edges: GraphEdge[] = [];
    for (const id of allIds) {
        rowsById.get(id)!.forEach((row, rowIndex) => {
            if (!row.target || row.back) return;
            const from = pos.get(id)!;
            edges.push({
                from: id,
                row: rowIndex,
                to: row.target,
                kind: row.kind,
                x1: from.x + NODE_W,
                y1: from.y + HEADER_H + rowIndex * ROW_H + ROW_H / 2,
                x2: 0,
                y2: 0,
            });
        });
    }
    const arrivals = new Map<string, GraphEdge[]>();
    for (const edge of edges) {
        arrivals.set(edge.to, [...(arrivals.get(edge.to) ?? []), edge]);
    }
    for (const [id, list] of arrivals) {
        const { x, y } = pos.get(id)!;
        list.sort((a, b) => a.y1 - b.y1);
        list.forEach((edge, i) => {
            edge.x2 = x;
            edge.y2 = y + (HEADER_H * (i + 1)) / (list.length + 1);
        });
    }

    const width = maxRank < 0 ? 0 : (maxRank + 1) * COL_STEP - RANK_GAP;
    return { nodes, edges, width, height };
}

/** SVG path for a forward edge laid out by layoutDialogue. */
export function edgePath(edge: GraphEdge): string {
    const { x1, y1, x2, y2 } = edge;
    const bend = Math.max(40, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}
