// @vitest-environment jsdom

import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialogOverlay } from '../components/DialogOverlay';
import { Inventory } from '../components/Inventory';

afterEach(cleanup);

function Harness({ onDismiss = () => {} }: { onDismiss?: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Open panel</button>
            {open && (
                <DialogOverlay
                    overlayClassName="test-overlay"
                    className="test-dialog"
                    ariaLabel="Test panel"
                    onDismiss={() => {
                        onDismiss();
                        setOpen(false);
                    }}
                >
                    <button>First action</button>
                    <button>Last action</button>
                </DialogOverlay>
            )}
        </>
    );
}

describe('DialogOverlay', () => {
    it('names the dialog, traps Tab, closes on Escape, and restores focus', () => {
        const onDismiss = vi.fn();
        render(<Harness onDismiss={onDismiss} />);
        const trigger = screen.getByRole('button', { name: 'Open panel' });
        trigger.focus();
        fireEvent.click(trigger);

        expect(
            screen
                .getByRole('dialog', { name: 'Test panel' })
                .getAttribute('aria-modal')
        ).toBe('true');
        const first = screen.getByRole('button', { name: 'First action' });
        const last = screen.getByRole('button', { name: 'Last action' });
        expect(first).toBe(document.activeElement);

        last.focus();
        fireEvent.keyDown(window, { key: 'Tab' });
        expect(first).toBe(document.activeElement);

        first.focus();
        fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
        expect(last).toBe(document.activeElement);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onDismiss).toHaveBeenCalledOnce();
        expect(trigger).toBe(document.activeElement);
    });

    it('dismisses only when the backdrop itself is clicked', () => {
        const onDismiss = vi.fn();
        render(<Harness onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open panel' }));

        fireEvent.click(screen.getByRole('dialog', { name: 'Test panel' }));
        expect(onDismiss).not.toHaveBeenCalled();
        fireEvent.click(document.querySelector('.test-overlay')!);
        expect(onDismiss).toHaveBeenCalledOnce();
    });
});

describe('Inventory keyboard access', () => {
    it('opens item details from the keyboard and restores focus on close', async () => {
        const user = userEvent.setup();
        render(
            <Inventory
                items={[
                    {
                        id: 'brass-key',
                        name: 'Brass Key',
                        description: 'Warm from the lock.',
                        icon: '',
                        image: '',
                        stats: {},
                    },
                ]}
            />
        );

        await user.tab();
        const item = screen.getByRole('button', { name: 'Brass Key' });
        expect(item).toBe(document.activeElement);
        await user.keyboard('{Enter}');

        expect(screen.getByRole('dialog', { name: 'Brass Key' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close' })).toBe(
            document.activeElement
        );

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog', { name: 'Brass Key' })).toBeNull();
        expect(item).toBe(document.activeElement);
    });
});
