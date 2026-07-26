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

function NestedHarness() {
    const [parentOpen, setParentOpen] = useState(false);
    const [childOpen, setChildOpen] = useState(false);
    return (
        <>
            <button onClick={() => setParentOpen(true)}>Open parent</button>
            {parentOpen && (
                <ModalShell
                    title="Parent modal"
                    onDismiss={() => setParentOpen(false)}
                >
                    <button onClick={() => setChildOpen(true)}>
                        Open child
                    </button>
                    {childOpen && (
                        <ModalShell
                            title="Child modal"
                            onDismiss={() => setChildOpen(false)}
                        >
                            <button>Child action</button>
                        </ModalShell>
                    )}
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

    it('dismisses only the topmost nested modal on Escape', () => {
        render(<NestedHarness />);
        fireEvent.click(screen.getByRole('button', { name: 'Open parent' }));
        const childTrigger = screen.getByRole('button', {
            name: 'Open child',
        });
        fireEvent.click(childTrigger);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(
            screen.queryByRole('dialog', { name: 'Child modal' })
        ).toBeNull();
        expect(
            screen.getByRole('dialog', { name: 'Parent modal' })
        ).toBeTruthy();
        expect(childTrigger).toBe(document.activeElement);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(
            screen.queryByRole('dialog', { name: 'Parent modal' })
        ).toBeNull();
    });
});
