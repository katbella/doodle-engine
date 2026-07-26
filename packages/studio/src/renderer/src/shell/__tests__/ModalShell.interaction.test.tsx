// @vitest-environment jsdom

import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { isAnyModalOpen, ModalShell } from '../ModalShell';

afterEach(cleanup);

function Harness({ onDismiss = () => {} }: { onDismiss?: () => void }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Open modal</button>
            {open && (
                <ModalShell
                    title="Accessible modal"
                    onDismiss={() => {
                        onDismiss();
                        setOpen(false);
                    }}
                >
                    <button>First action</button>
                    <button>Last action</button>
                </ModalShell>
            )}
        </>
    );
}

describe('ModalShell', () => {
    it('provides an accessible name and restores focus after Escape', () => {
        const onDismiss = vi.fn();
        render(<Harness onDismiss={onDismiss} />);
        const trigger = screen.getByRole('button', { name: 'Open modal' });
        trigger.focus();
        fireEvent.click(trigger);

        const dialog = screen.getByRole('dialog', {
            name: 'Accessible modal',
        });
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(screen.getByRole('button', { name: 'First action' })).toBe(
            document.activeElement
        );
        expect(isAnyModalOpen()).toBe(true);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onDismiss).toHaveBeenCalledOnce();
        expect(isAnyModalOpen()).toBe(false);
        expect(trigger).toBe(document.activeElement);
    });

    it('contains forward and backward Tab focus', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open modal' }));
        const first = screen.getByRole('button', { name: 'First action' });
        const last = screen.getByRole('button', { name: 'Last action' });

        last.focus();
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(first).toBe(document.activeElement);

        first.focus();
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(last).toBe(document.activeElement);
    });

    it('dismisses from the backdrop but not from inside the dialog', () => {
        const onDismiss = vi.fn();
        render(<Harness onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: 'Open modal' }));

        fireEvent.click(
            screen.getByRole('dialog', { name: 'Accessible modal' })
        );
        expect(onDismiss).not.toHaveBeenCalled();

        fireEvent.click(document.querySelector('.modal-backdrop')!);
        expect(onDismiss).toHaveBeenCalledOnce();
    });
});
