import { describe, expect, it } from 'vitest';
import type { Dialogue, DialogueNode } from '@doodle-engine/core';
import {
    edgePath,
    HEADER_H,
    layoutDialogue,
    NODE_W,
    ROW_H,
} from '../dialogue-graph';

const node = (id: string, extra: Partial<DialogueNode> = {}): DialogueNode => ({
    id,
    speaker: null,
    text: `${id} line`,
    choices: [],
    ...extra,
});

const choice = (id: string, next: string) => ({ id, text: `to ${next}`, next });

const dlg = (startNode: string, nodes: DialogueNode[]): Dialogue => ({
    id: 'test',
    startNode,
    nodes,
});

describe('layoutDialogue', () => {
    it('ranks a chain left to right from the start node', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', { next: 'b' }),
                node('b', { next: 'c' }),
                node('c'),
            ])
        );
        const at = (id: string) => graph.nodes.find((n) => n.id === id)!;
        expect(at('a').x).toBeLessThan(at('b').x);
        expect(at('b').x).toBeLessThan(at('c').x);
        expect(at('a').isStart).toBe(true);
        expect(at('c').isEnd).toBe(true);
        expect(at('c').unreachable).toBe(false);
        expect(graph.width).toBeGreaterThanOrEqual(NODE_W * 3);
        expect(graph.height).toBeGreaterThanOrEqual(HEADER_H);
    });

    it('lists every outgoing route as a row: choices, then branches, then GOTO', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', {
                    choices: [choice('c1', 'b')],
                    conditionalBranches: [
                        {
                            condition: { type: 'hasFlag', flag: 'f' },
                            next: 'c',
                        },
                    ],
                    next: 'b',
                }),
                node('b'),
                node('c'),
            ])
        );
        const a = graph.nodes.find((n) => n.id === 'a')!;
        expect(a.rows.map((r) => r.kind)).toEqual(['choice', 'branch', 'goto']);
        expect(a.rows.map((r) => r.target)).toEqual(['b', 'c', 'b']);
        const kinds = graph.edges.map((e) => e.kind).sort();
        expect(kinds).toEqual(['branch', 'choice', 'goto']);
    });

    it('sizes nodes by their row count', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', {
                    choices: [
                        choice('c1', 'b'),
                        choice('c2', 'b'),
                        choice('c3', 'b'),
                    ],
                }),
                node('b'),
            ])
        );
        const at = (id: string) => graph.nodes.find((n) => n.id === id)!;
        expect(at('a').h).toBeGreaterThanOrEqual(HEADER_H + 3 * ROW_H);
        expect(at('b').h).toBe(HEADER_H);
    });

    it('turns routes to an earlier column into chips, not lines', () => {
        const graph = layoutDialogue(
            dlg('hub', [
                node('hub', { choices: [choice('c1', 'topic')] }),
                node('topic', { next: 'hub' }),
            ])
        );
        const topic = graph.nodes.find((n) => n.id === 'topic')!;
        expect(topic.rows).toEqual([
            { kind: 'goto', index: 0, target: 'hub', back: true },
        ]);
        // Only the forward edge is drawn.
        expect(graph.edges).toHaveLength(1);
        expect(graph.edges[0].from).toBe('hub');
    });

    it('treats self loops as back routes', () => {
        const graph = layoutDialogue(
            dlg('a', [node('a', { choices: [choice('c1', 'a')] })])
        );
        expect(graph.edges).toEqual([]);
        expect(graph.nodes[0].rows[0].back).toBe(true);
        expect(graph.nodes[0].isEnd).toBe(false);
    });

    it('parks unreachable nodes in trailing columns and flags them', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', { next: 'b' }),
                node('b'),
                node('lost', { next: 'alsoLost' }),
                node('alsoLost'),
            ])
        );
        const at = (id: string) => graph.nodes.find((n) => n.id === id)!;
        expect(at('lost').unreachable).toBe(true);
        expect(at('alsoLost').unreachable).toBe(true);
        expect(at('lost').x).toBeGreaterThan(at('b').x);
        expect(at('alsoLost').x).toBeGreaterThan(at('lost').x);
        expect(at('b').unreachable).toBe(false);
    });

    it('creates a ghost node for a dangling target', () => {
        const graph = layoutDialogue(
            dlg('a', [node('a', { choices: [choice('c1', 'missing')] })])
        );
        const ghost = graph.nodes.find((n) => n.id === 'missing')!;
        expect(ghost.node).toBeNull();
        expect(ghost.rows).toEqual([]);
        expect(ghost.isEnd).toBe(false);
        expect(graph.edges[0].to).toBe('missing');
    });

    it('treats an empty choice target as an ending row, not an edge', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', { choices: [{ id: 'c1', text: 'bye', next: '' }] }),
            ])
        );
        expect(graph.edges).toEqual([]);
        expect(graph.nodes[0].rows[0].target).toBeNull();
        expect(graph.nodes[0].isEnd).toBe(true);
    });

    it('anchors each edge at its own row and fans arrivals apart', () => {
        const graph = layoutDialogue(
            dlg('a', [
                node('a', { choices: [choice('c1', 'b'), choice('c2', 'b')] }),
                node('b'),
            ])
        );
        const [first, second] = graph.edges;
        expect(second.y1 - first.y1).toBe(ROW_H);
        expect(first.y2).not.toBe(second.y2);
    });

    it('returns an empty graph for a dialogue with no nodes', () => {
        const graph = layoutDialogue(dlg('', []));
        expect(graph.nodes).toEqual([]);
        expect(graph.edges).toEqual([]);
        expect(graph.width).toBe(0);
    });
});

describe('edgePath', () => {
    it('draws forward edges as a cubic bezier between anchors', () => {
        const graph = layoutDialogue(
            dlg('a', [node('a', { next: 'b' }), node('b')])
        );
        const path = edgePath(graph.edges[0]);
        expect(path).toMatch(/^M .* C /);
        expect(path).toContain(`${graph.edges[0].x1}`);
    });
});
