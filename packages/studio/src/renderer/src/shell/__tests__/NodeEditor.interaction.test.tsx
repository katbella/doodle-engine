// @vitest-environment jsdom

import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ContentRegistry, DialogueNode } from '@doodle-engine/core';

vi.mock('../ConditionEffectBuilder', () => ({
    ConditionEffectBuilder: (props: any) => (
        <div>
            <span>
                builder:{props.mode}:{String(props.inRequire ?? false)}
            </span>
            <button
                onClick={() =>
                    props.onCommit(
                        props.mode === 'condition'
                            ? { type: 'hasFlag', flag: 'committed' }
                            : { type: 'setFlag', flag: 'committed' }
                    )
                }
            >
                Commit builder
            </button>
            <button onClick={props.onCancel}>Cancel builder</button>
        </div>
    ),
}));

import { NodeEditor } from '../NodeEditor';

afterEach(cleanup);

const registry = {
    locations: { town: { id: 'town' } },
    characters: { hero: { id: 'hero' } },
    items: {},
    maps: {},
    dialogues: {},
    quests: {},
    journalEntries: {},
    interludes: {},
    locales: {},
} as unknown as ContentRegistry;

const initialNode: DialogueNode = {
    id: 'start',
    speaker: 'missing_speaker',
    text: 'Opening line',
    voice: 'voice.ogg',
    portrait: 'portrait.png',
    effects: [{ type: 'setFlag', flag: 'visited' }],
    conditionalBranches: [
        {
            condition: { type: 'hasFlag', flag: 'trusted' },
            effects: [{ type: 'addVariable', variable: 'gold', value: 1 }],
            next: 'end',
        },
    ],
    choices: [
        {
            id: 'leave',
            text: 'Leave',
            next: '',
            conditions: [{ type: 'hasFlag', flag: 'ready' }],
            effects: [{ type: 'goToLocation', locationId: 'town' }],
        },
    ],
    next: 'end',
};

function Harness({ isStart = false }: { isStart?: boolean }) {
    const [node, setNode] = useState(initialNode);
    return (
        <>
            <NodeEditor
                node={node}
                isStart={isStart}
                characters={['hero']}
                nodeIds={['start', 'end']}
                registry={registry}
                projectDir="C:/story"
                onChange={setNode}
                onRename={(oldId, newId) =>
                    setNode((value) => ({ ...value, id: `${oldId}->${newId}` }))
                }
                onMakeStart={vi.fn()}
                onDelete={vi.fn()}
            />
            <output data-testid="node-state">{JSON.stringify(node)}</output>
        </>
    );
}

function state(): DialogueNode {
    return JSON.parse(screen.getByTestId('node-state').textContent!);
}

describe('NodeEditor', () => {
    it('validates and commits node ids and edits scalar fields', async () => {
        const importAsset = vi
            .fn()
            .mockResolvedValueOnce('chosen.ogg')
            .mockResolvedValueOnce('chosen.png');
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { importAsset },
        });
        const user = userEvent.setup();
        const { rerender } = render(<Harness />);
        const id = screen.getByTitle('Node id (used by GOTO targets)');

        await user.clear(id);
        await user.type(id, 'end');
        fireEvent.blur(id);
        expect(id.className).toContain('dlg__input--invalid');
        await user.clear(id);
        await user.type(id, 'bad id');
        fireEvent.blur(id);
        expect(id.className).toContain('dlg__input--invalid');
        await user.clear(id);
        await user.type(id, 'bad-id');
        fireEvent.blur(id);
        expect(
            screen.getByText('Use letters, numbers, and underscores only.')
        ).toBeTruthy();
        await user.clear(id);
        await user.type(id, 'opening');
        fireEvent.blur(id);
        expect(state().id).toBe('start->opening');

        const speaker = screen.getAllByRole('combobox')[0];
        expect(
            screen.getByRole('option', { name: 'missing_speaker' })
        ).toBeTruthy();
        await user.selectOptions(speaker, 'hero');
        expect(state().speaker).toBe('hero');
        await user.selectOptions(speaker, '');
        expect(state().speaker).toBeNull();

        const line = screen.getByPlaceholderText('@locale.key or plain text');
        await user.clear(line);
        await user.type(line, 'Changed line');
        await user.click(
            screen.getByRole('button', { name: 'Choose Voice file' })
        );
        await user.click(
            screen.getByRole('button', { name: 'Choose Portrait file' })
        );
        expect(importAsset).toHaveBeenNthCalledWith(1, 'C:/story', 'voice');
        expect(importAsset).toHaveBeenNthCalledWith(2, 'C:/story', 'portrait');
        expect(state().voice).toBe('chosen.ogg');
        expect(state().portrait).toBe('chosen.png');
        const media = screen.getAllByPlaceholderText('(none)');
        await user.clear(media[0]);
        await user.clear(media[1]);
        expect(state().text).toBe('Changed line');
        expect(state()).not.toHaveProperty('voice');
        expect(state()).not.toHaveProperty('portrait');

        await user.click(screen.getByRole('button', { name: 'Set as start' }));
        await user.click(screen.getByRole('button', { name: 'Delete node' }));
        rerender(<Harness isStart />);
        expect(document.querySelector('.dlg__node-badge')?.textContent).toBe(
            'start'
        );
        expect(
            screen.queryByRole('button', { name: 'Set as start' })
        ).toBeNull();
    });

    it('edits effects, branches, choices, and all target types', async () => {
        const user = userEvent.setup();
        const { container } = render(<Harness />);
        const sections = container.querySelectorAll('.node-editor__section');
        const nodeEffects = within(sections[0] as HTMLElement);
        const branches = within(sections[1] as HTMLElement);
        const choices = within(sections[2] as HTMLElement);
        const defaultTarget = within(sections[3] as HTMLElement);

        await user.click(nodeEffects.getByTitle('Edit'));
        expect(screen.getByText('builder:effect:false')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Commit builder' })
        );
        expect(state().effects).toEqual([
            { type: 'setFlag', flag: 'committed' },
        ]);
        await user.click(
            nodeEffects.getByRole('button', { name: /Add effect/ })
        );
        await user.click(
            screen.getByRole('button', { name: 'Commit builder' })
        );
        expect(state().effects).toHaveLength(2);
        await user.click(
            nodeEffects.getAllByRole('button', { name: 'Remove' })[0]
        );
        expect(state().effects).toHaveLength(1);

        await user.click(branches.getByTitle('Edit condition'));
        expect(screen.getByText('builder:condition:false')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Commit builder' })
        );
        expect(state().conditionalBranches?.[0].condition).toEqual({
            type: 'hasFlag',
            flag: 'committed',
        });
        await user.selectOptions(branches.getByRole('combobox'), 'start');
        expect(state().conditionalBranches?.[0].next).toBe('start');
        await user.click(branches.getByRole('button', { name: /Branch/ }));
        expect(state().conditionalBranches).toHaveLength(2);
        await user.click(
            branches.getAllByRole('button', { name: 'Remove branch' })[1]
        );
        expect(state().conditionalBranches).toHaveLength(1);

        expect(screen.getByText(/Routes to a location/)).toBeTruthy();
        const choiceTarget = choices.getAllByRole('combobox').at(-1)!;
        await user.selectOptions(choiceTarget, '__end__');
        expect(state().choices[0]).toMatchObject({
            next: '',
            effects: [{ type: 'endDialogue' }],
        });
        await user.selectOptions(choiceTarget, 'end');
        expect(state().choices[0]).toMatchObject({ next: 'end' });
        expect(state().choices[0].effects).toBeUndefined();

        await user.click(
            choices.getByRole('button', { name: /Add requirement/ })
        );
        expect(screen.getByText('builder:condition:true')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Cancel builder' })
        );
        await user.click(choices.getByRole('button', { name: /Choice/ }));
        expect(state().choices).toHaveLength(2);
        await user.click(
            choices.getAllByRole('button', { name: 'Remove choice' })[1]
        );
        expect(state().choices).toHaveLength(1);
        const choiceText = choices.getByPlaceholderText(
            '@choice.key or plain text'
        );
        await user.clear(choiceText);
        await user.type(choiceText, 'Stay');
        expect(state().choices[0].text).toBe('Stay');

        await user.selectOptions(defaultTarget.getByRole('combobox'), '');
        expect(state().next).toBeUndefined();
        await user.click(
            branches.getByRole('button', { name: 'Remove branch' })
        );
        expect(state().conditionalBranches).toEqual([]);
    });
});
