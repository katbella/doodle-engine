// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import { DialogueGraphView } from '../DialogueGraphView';

const project = {
    projectDir: 'C:/games/test',
    registry: {
        locations: {},
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: { en: { 'line.hello': 'Hello there.' } },
    },
} as unknown as OpenProject;

const source = `NODE start
  BARTENDER: @line.hello
  CHOICE Ask around
    GOTO topic
  END
  CHOICE Leave
    END dialogue
  END

NODE topic
  NARRATOR: Some gossip.
  CHOICE Tell me more
    GOTO missing_node
  END
  CHOICE Never mind
    GOTO start
  END

NODE island
  NARRATOR: Never reached.
  END dialogue
`;

function installBridge(content = source) {
    Object.defineProperty(window, 'studio', {
        configurable: true,
        value: {
            readDocument: vi.fn(async () => ({ content, mtimeMs: 10 })),
        },
    });
}

function renderGraph(selectedNodeId: string | null = null) {
    const onSelectNode = vi.fn();
    const onOpenNode = vi.fn();
    render(
        <DialogueGraphView
            project={project}
            path="content/dialogues/audit.dlg"
            dialogueId="audit"
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onOpenNode={onOpenNode}
        />
    );
    return { onSelectNode, onOpenNode };
}

const findNode = (id: string) =>
    screen.findByRole('button', { name: `Select node ${id}` });

afterEach(cleanup);

describe('DialogueGraphView', () => {
    it('renders nodes with badges, previews, choice rows, chips, ghosts, and unreachable styling', async () => {
        installBridge();
        renderGraph();

        const start = await findNode('start');
        expect(start.classList.contains('graph__node--start')).toBe(true);
        expect(start.querySelector('.graph__badge--start')).toBeTruthy();
        // The node line resolves its @key through the locale data.
        expect(screen.getByText('bartender: Hello there.')).toBeTruthy();
        // Choices appear as rows; a choice that ends the dialogue is chipped.
        expect(screen.getByText('Ask around')).toBeTruthy();
        const leave = screen.getByText('Leave').closest('.graph__row')!;
        expect(leave.querySelector('.graph__chip--end')?.textContent).toBe(
            'END'
        );
        // A route looping back to an earlier node is a chip, not an edge.
        const back = screen.getByText('Never mind').closest('.graph__row')!;
        expect(back.querySelector('.graph__chip')?.textContent).toContain(
            'start'
        );

        // island has no routes out and no route in.
        const island = await findNode('island');
        expect(island.classList.contains('graph__node--unreachable')).toBe(
            true
        );
        expect(island.querySelector('.graph__badge')?.textContent).toBe('end');

        // topic's first choice points at a node that doesn't exist.
        const ghost = await findNode('missing_node');
        expect(ghost.classList.contains('graph__node--ghost')).toBe(true);
        expect(screen.getByText('No node has this id')).toBeTruthy();
    });

    it('selects a node on click but not after a drag', async () => {
        installBridge();
        const user = userEvent.setup();
        const { onSelectNode, onOpenNode } = renderGraph();

        const topic = await findNode('topic');
        await user.click(topic);
        expect(onSelectNode).toHaveBeenCalledWith('topic');
        expect(onOpenNode).not.toHaveBeenCalled();

        // A real drag that starts on a node pans instead of selecting.
        onSelectNode.mockClear();
        const svg = document.querySelector('.graph')!;
        fireEvent.pointerDown(topic, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(svg, { clientX: 60, clientY: 40 });
        fireEvent.pointerUp(svg, { clientX: 60, clientY: 40 });
        expect(onSelectNode).not.toHaveBeenCalled();
    });

    it('opens the Visual editor from the pencil button or a double-click', async () => {
        installBridge();
        const user = userEvent.setup();
        const { onOpenNode } = renderGraph();

        const topic = await findNode('topic');
        await user.click(
            screen.getByRole('button', {
                name: 'Open node topic in the Visual editor',
            })
        );
        expect(onOpenNode).toHaveBeenCalledWith('topic');

        onOpenNode.mockClear();
        await user.dblClick(topic);
        expect(onOpenNode).toHaveBeenCalledWith('topic');

        // Ghosts have nothing to open.
        const ghost = await findNode('missing_node');
        expect(ghost.querySelector('.graph__node-open')).toBeNull();
        onOpenNode.mockClear();
        await user.dblClick(ghost);
        expect(onOpenNode).not.toHaveBeenCalled();
    });

    it('selects a node with the keyboard', async () => {
        installBridge();
        const { onSelectNode } = renderGraph();
        const start = await findNode('start');
        fireEvent.keyDown(start, { key: 'Enter' });
        expect(onSelectNode).toHaveBeenCalledWith('start');
    });

    it('marks the selected node', async () => {
        installBridge();
        renderGraph('topic');
        const topic = await findNode('topic');
        expect(topic.classList.contains('graph__node--selected')).toBe(true);
    });

    it('pans with pointer drag and zooms on wheel without re-laying-out', async () => {
        installBridge();
        renderGraph();
        await findNode('start');

        const svg = document.querySelector('.graph')!;
        const scene = svg.querySelector('g')!;
        const before = scene.getAttribute('transform')!;

        fireEvent.pointerDown(svg, { button: 0, clientX: 5, clientY: 5 });
        fireEvent.pointerMove(svg, { clientX: 45, clientY: 25 });
        fireEvent.pointerUp(svg, { clientX: 45, clientY: 25 });
        await waitFor(() =>
            expect(scene.getAttribute('transform')).not.toBe(before)
        );

        const panned = scene.getAttribute('transform')!;
        fireEvent.wheel(svg, { deltaY: -240, clientX: 20, clientY: 20 });
        await waitFor(() =>
            expect(scene.getAttribute('transform')).not.toBe(panned)
        );
    });

    it('guides the author to Source when the dialogue cannot be parsed', async () => {
        installBridge('NODE start\n  this is not valid dialogue syntax\n');
        renderGraph();
        expect(
            await screen.findByText(
                /syntax error and can’t be shown as a graph/i
            )
        ).toBeTruthy();
        expect(screen.getByText(/Switch to Source to fix it/i)).toBeTruthy();
    });
});
