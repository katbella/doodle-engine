// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmModal } from '../ConfirmModal';

afterEach(cleanup);

describe('ConfirmModal real interaction', () => {
    it('clicking the confirm button calls onConfirm, not onCancel', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmModal
                title="Delete “bartender”?"
                message="This removes the file."
                confirmLabel="Delete"
                danger
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('Delete'));
        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('clicking Cancel calls onCancel, not onConfirm', () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(
            <ConfirmModal
                title="Delete?"
                message="msg"
                confirmLabel="Delete"
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('clicking the backdrop cancels, like pressing Escape would', () => {
        const onCancel = vi.fn();
        render(
            <ConfirmModal
                title="Delete?"
                message="msg"
                confirmLabel="Delete"
                onConfirm={() => {}}
                onCancel={onCancel}
            />
        );
        fireEvent.click(document.querySelector('.modal-backdrop')!);
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('clicking inside the modal body does not cancel', () => {
        const onCancel = vi.fn();
        render(
            <ConfirmModal
                title="Delete?"
                message="This removes the file."
                confirmLabel="Delete"
                onConfirm={() => {}}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('This removes the file.'));
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('shows the supplied title and message', () => {
        render(
            <ConfirmModal
                title="Delete “old_coin”?"
                message="3 places reference it."
                confirmLabel="Delete"
                onConfirm={() => {}}
                onCancel={() => {}}
            />
        );
        expect(screen.getByText('Delete “old_coin”?')).toBeTruthy();
        expect(screen.getByText('3 places reference it.')).toBeTruthy();
    });
});
