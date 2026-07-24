// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NameCatalog } from '../../lib/flag-vars';
import {
    FlagVarNavigationProvider,
    type OpenFlagVar,
} from '../FlagVarNavigation';
import { NameAwareField } from '../NameAwareField';

afterEach(cleanup);

const catalog: NameCatalog = {
    flags: [
        {
            kind: 'flag',
            id: 'metGuide',
            count: 10,
            setCount: 3,
            checkCount: 7,
            references: [],
            note: 'Player has met the guide.',
        },
        {
            kind: 'flag',
            id: 'metBartender',
            count: 2,
            setCount: 1,
            checkCount: 1,
            references: [],
            note: '',
        },
    ],
    variables: [],
    stats: [],
};

function Field({
    initial = 'metGuide',
    onOpenFlagVar,
}: {
    initial?: string;
    onOpenFlagVar?: OpenFlagVar;
}) {
    const [value, setValue] = useState(initial);
    return (
        <FlagVarNavigationProvider onOpen={onOpenFlagVar}>
            <NameAwareField
                kind="flag"
                value={value}
                catalog={catalog}
                ariaLabel="Flag name"
                onChange={setValue}
            />
        </FlagVarNavigationProvider>
    );
}

describe('NameAwareField', () => {
    it('shows existing-name context, identifies a new name, and picks safely', async () => {
        const user = userEvent.setup();
        const onOpenFlagVar = vi.fn();
        render(<Field onOpenFlagVar={onOpenFlagVar} />);
        const input = screen.getByRole('textbox', { name: 'Flag name' });

        expect(screen.getByText('Flag details')).toBeTruthy();
        expect(screen.getByText('Flag note')).toBeTruthy();
        await user.click(
            screen.getByRole('button', { name: 'Edit in Flags & variables' })
        );
        expect(onOpenFlagVar).toHaveBeenCalledWith('flag', 'metGuide');
        expect(screen.getByText('Player has met the guide.')).toBeTruthy();

        await user.click(input);
        expect(screen.getByText('Set in 3 places, checked in 7')).toBeTruthy();
        expect(screen.getAllByText('Player has met the guide.').length).toBe(1);

        await user.keyboard('{Escape}');
        expect(screen.getByText('Flag note')).toBeTruthy();
        expect(screen.getByText('Player has met the guide.')).toBeTruthy();

        await user.clear(input);
        await user.type(input, 'metGude');
        expect(screen.getByText('new flag')).toBeTruthy();
        expect(screen.getByText('metGude')).toBeTruthy();

        await user.clear(input);
        await user.type(input, 'bart');
        await user.click(screen.getByRole('option', { name: /metBartender/ }));
        expect((input as HTMLInputElement).value).toBe('metBartender');
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByText('Flag details')).toBeTruthy();
        expect(
            screen.getByText('No note has been added for this flag.')
        ).toBeTruthy();
    });

    it('hides the details panel in compact placements but keeps suggestions', async () => {
        const user = userEvent.setup();
        render(
            <NameAwareField
                kind="flag"
                value="metGuide"
                catalog={catalog}
                ariaLabel="Flag name"
                showContext={false}
                onChange={() => {}}
            />
        );
        expect(screen.queryByText('Flag details')).toBeNull();
        expect(screen.queryByText('Flag note')).toBeNull();

        await user.click(screen.getByRole('textbox', { name: 'Flag name' }));
        expect(screen.getByRole('option', { name: /metGuide/ })).toBeTruthy();
    });

    it('contains Escape while dismissing the suggestion popover', async () => {
        const user = userEvent.setup();
        const windowKeyDown = vi.fn();
        window.addEventListener('keydown', windowKeyDown);
        render(<Field initial="brandNewFlag" />);
        const input = screen.getByRole('textbox', { name: 'Flag name' });

        await user.click(input);
        expect(input.getAttribute('aria-expanded')).toBe('true');
        await user.keyboard('{Escape}');

        expect(windowKeyDown).not.toHaveBeenCalled();
        expect(input.getAttribute('aria-expanded')).toBe('false');
        expect((input as HTMLInputElement).value).toBe('brandNewFlag');
        window.removeEventListener('keydown', windowKeyDown);
    });
});
