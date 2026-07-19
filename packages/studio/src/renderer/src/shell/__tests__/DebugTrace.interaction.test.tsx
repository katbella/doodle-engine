// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TraceEvent } from '@doodle-engine/core';
import { DebugTrace } from '../DebugTrace';

afterEach(cleanup);

const trace: TraceEvent[] = [
    { kind: 'nodeEnter', seq: 1, dialogueId: 'intro', nodeId: 'start' },
    {
        kind: 'condition',
        seq: 2,
        condition: { type: 'hasFlag', flag: 'trusted' },
        resolvedValues: { flag: false },
        result: false,
        context: { type: 'choice', choiceId: 'ask' },
    },
    {
        kind: 'effect',
        seq: 3,
        effect: { type: 'setFlag', flag: 'metBartender' },
        delta: {},
    },
    {
        kind: 'transition',
        seq: 4,
        dialogueId: 'intro',
        fromNode: 'start',
        toNode: 'rumors',
    },
    {
        kind: 'choiceFiltered',
        seq: 5,
        dialogueId: 'intro',
        nodeId: 'start',
        choiceId: 'secret',
        failedCondition: { type: 'hasFlag', flag: 'trusted' },
        resolvedValues: { flag: false },
    },
    { kind: 'error', seq: 6, message: 'Recovered problem' },
    {
        kind: 'condition',
        seq: 7,
        condition: { type: 'hasItem', itemId: 'coin' },
        resolvedValues: { hasItem: true },
        result: true,
        context: { type: 'branch', branchIndex: 0 },
    },
];

describe('DebugTrace', () => {
    it('describes every trace event and condition result', () => {
        const view = render(<DebugTrace trace={trace} />);
        expect(screen.getAllByText('start').length).toBeGreaterThan(0);

        const conditionRow = screen.getAllByText('CONDITION')[0].parentElement!;
        expect(conditionRow.textContent).toContain('hasFlag trusted = false');
        expect(within(conditionRow).getByText('FAIL')).toBeTruthy();

        const effectRow = screen.getByText('EFFECT').parentElement!;
        expect(
            within(effectRow)
                .getByText('SET')
                .classList.contains('trace__tok--keyword')
        ).toBe(true);
        expect(
            within(effectRow)
                .getByText('metBartender')
                .classList.contains('trace__tok--id')
        ).toBe(true);

        const transitionRow = screen.getByText('TRANSITION').parentElement!;
        expect(within(transitionRow).getByText('start')).toBeTruthy();
        expect(within(transitionRow).getByText('rumors')).toBeTruthy();
        expect(transitionRow.textContent).not.toContain('start to rumors');
        expect(transitionRow.querySelector('svg.trace__to')).toBeTruthy();

        const hiddenRow = screen.getByText('HIDDEN').parentElement!;
        expect(hiddenRow.textContent).toContain('secret: hasFlag trusted');
        expect(screen.getByText('Recovered problem')).toBeTruthy();
        expect(screen.getByText('PASS')).toBeTruthy();
        expect(screen.getAllByText('FAIL')).toHaveLength(3);
        expect(view.container.querySelector('.trace__row--node')).toBeTruthy();
    });

    it('filters by kind and searches displayed descriptions', async () => {
        const user = userEvent.setup();
        render(<DebugTrace trace={trace} />);
        await user.click(screen.getByRole('button', { name: 'Effects' }));
        expect(screen.getByText('metBartender')).toBeTruthy();
        expect(screen.queryByText('Recovered problem')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'All' }));
        const search = screen.getByRole('textbox', {
            name: 'Search trace by id',
        });
        await user.type(search, 'metBartender');
        expect(screen.getByText('metBartender')).toBeTruthy();
        expect(screen.queryByText('TRANSITION')).toBeNull();

        await user.clear(search);
        await user.type(search, 'start to rumors');
        expect(screen.getByText('TRANSITION')).toBeTruthy();
        expect(screen.queryByText('to')).toBeNull();

        await user.clear(search);
        await user.type(search, 'recovered');
        expect(screen.getByText('Recovered problem')).toBeTruthy();
        expect(screen.queryByText('metBartender')).toBeNull();
        await user.clear(search);
        await user.type(search, 'does-not-exist');
        expect(
            screen.getByText('No results for “does-not-exist”.')
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByText('metBartender')).toBeTruthy();
    });

    it('explains an empty event category and returns to all events', async () => {
        const user = userEvent.setup();
        render(
            <DebugTrace
                trace={trace.filter((event) => event.kind !== 'transition')}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Transitions' }));
        expect(
            screen.getByText('No transitions were recorded in this playtest.')
        ).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Show all events' })
        );
        expect(screen.getByText('metBartender')).toBeTruthy();
    });

    it('distinguishes an empty trace from an empty filter result', () => {
        render(<DebugTrace trace={[]} />);
        expect(
            screen.getByText('Start a dialogue to begin the trace.')
        ).toBeTruthy();
    });
});
