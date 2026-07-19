// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
        resolvedValues: { flag: true },
        result: true,
        context: { type: 'choice', choiceId: 'ask' },
    },
    {
        kind: 'effect',
        seq: 3,
        effect: { type: 'setFlag', flag: 'asked' },
        delta: {},
    },
    {
        kind: 'transition',
        seq: 4,
        dialogueId: 'intro',
        fromNode: 'start',
        toNode: null,
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
];

describe('DebugTrace', () => {
    it('describes every trace event and condition result', () => {
        render(<DebugTrace trace={trace} />);
        expect(screen.getByText('start')).toBeTruthy();
        expect(screen.getByText(/hasFlag trusted.*true/i)).toBeTruthy();
        expect(screen.getByText(/SET flag asked/i)).toBeTruthy();
        expect(
            screen.getByText('TRANSITION').parentElement?.textContent
        ).toContain('start to end');
        expect(screen.getByText(/secret:.*hasFlag trusted/i)).toBeTruthy();
        expect(screen.getByText('Recovered problem')).toBeTruthy();
        expect(screen.getByText('PASS')).toBeTruthy();
        expect(screen.getAllByText('FAIL')).toHaveLength(2);
    });

    it('filters by kind and searches displayed descriptions', async () => {
        const user = userEvent.setup();
        render(<DebugTrace trace={trace} />);
        await user.click(screen.getByRole('button', { name: 'Effects' }));
        expect(screen.getByText(/SET flag asked/i)).toBeTruthy();
        expect(screen.queryByText('Recovered problem')).toBeNull();

        await user.click(screen.getByRole('button', { name: 'All' }));
        await user.type(
            screen.getByRole('textbox', { name: 'Search trace by id' }),
            'recovered'
        );
        expect(screen.getByText('Recovered problem')).toBeTruthy();
        expect(screen.queryByText(/SET flag asked/i)).toBeNull();
        await user.clear(screen.getByRole('textbox'));
        await user.type(screen.getByRole('textbox'), 'does-not-exist');
        expect(
            screen.getByText('No results for “does-not-exist”.')
        ).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByText(/SET flag asked/i)).toBeTruthy();
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
        expect(screen.getByText(/SET flag asked/i)).toBeTruthy();
    });

    it('distinguishes an empty trace from an empty filter result', () => {
        render(<DebugTrace trace={[]} />);
        expect(
            screen.getByText('Start a dialogue to begin the trace.')
        ).toBeTruthy();
    });
});
