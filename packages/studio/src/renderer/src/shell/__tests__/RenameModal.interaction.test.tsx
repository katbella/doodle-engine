// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RenameModal } from '../RenameModal';

afterEach(cleanup);

describe('RenameModal real interaction', () => {
    it('typing a new id and clicking Rename calls onRename with the trimmed id', () => {
        const onRename = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender', 'merchant']}
                referenceCount={3}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        const input = screen.getByDisplayValue('bartender');
        fireEvent.change(input, { target: { value: '  marcus  ' } });
        fireEvent.click(screen.getByText('Rename'));
        expect(onRename).toHaveBeenCalledExactlyOnceWith('marcus');
    });

    it('shows how many references will be updated', () => {
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={3}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect(
            screen.getByText('3 references in other files will be updated.')
        ).toBeTruthy();
    });

    it('says nothing else references it when the count is zero', () => {
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect(
            screen.getByText('Nothing else references this id.')
        ).toBeTruthy();
    });

    it('rejects an id already used by another item and disables Rename', () => {
        const onRename = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender', 'merchant']}
                referenceCount={0}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        fireEvent.change(screen.getByDisplayValue('bartender'), {
            target: { value: 'merchant' },
        });
        expect(
            screen.getByText('A character with this id already exists.')
        ).toBeTruthy();
        const button = screen.getByText('Rename') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        fireEvent.click(button);
        expect(onRename).not.toHaveBeenCalled();
    });

    it('rejects ids with characters other than letters, numbers, and underscores', () => {
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        fireEvent.change(screen.getByDisplayValue('bartender'), {
            target: { value: 'bar tender!' },
        });
        expect(
            screen.getByText('Use letters, numbers, and underscores only.')
        ).toBeTruthy();
        expect((screen.getByText('Rename') as HTMLButtonElement).disabled).toBe(
            true
        );
    });

    it('disables Rename when the id is unchanged', () => {
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect((screen.getByText('Rename') as HTMLButtonElement).disabled).toBe(
            true
        );
    });

    it('pressing Enter with a valid id submits the rename', () => {
        const onRename = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        const input = screen.getByDisplayValue('bartender');
        fireEvent.change(input, { target: { value: 'marcus' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onRename).toHaveBeenCalledExactlyOnceWith('marcus');
    });

    it('pressing Enter with an invalid id does not submit', () => {
        const onRename = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender', 'merchant']}
                referenceCount={0}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        const input = screen.getByDisplayValue('bartender');
        fireEvent.change(input, { target: { value: 'merchant' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onRename).not.toHaveBeenCalled();
    });

    it('clicking the backdrop cancels, clicking inside the modal does not', () => {
        const onCancel = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={() => {}}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('Rename').closest('.modal')!);
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Rename').closest('.modal-backdrop')!);
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('clicking Cancel calls onCancel', () => {
        const onCancel = vi.fn();
        render(
            <RenameModal
                section="characters"
                oldId="bartender"
                existingIds={['bartender']}
                referenceCount={0}
                onRename={() => {}}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledOnce();
    });
});
