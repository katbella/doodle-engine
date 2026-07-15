// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FlagVarRenameModal } from '../FlagVarRenameModal';

afterEach(cleanup);

describe('FlagVarRenameModal real interaction', () => {
    it('typing a new name and clicking Rename calls onRename with the trimmed value', () => {
        const onRename = vi.fn();
        render(
            <FlagVarRenameModal
                kind="flag"
                oldId="metBartender"
                usageCount={2}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        const input = screen.getByDisplayValue('metBartender');
        fireEvent.change(input, { target: { value: '  met_bartender  ' } });
        fireEvent.click(screen.getByText('Rename'));
        expect(onRename).toHaveBeenCalledExactlyOnceWith('met_bartender');
    });

    it('reports the usage count and the not-fully-indexed caveat', () => {
        render(
            <FlagVarRenameModal
                kind="variable"
                oldId="gold"
                usageCount={1}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect(screen.getByText(/1 known usage will be updated/)).toBeTruthy();
    });

    it('pluralizes the usage count correctly', () => {
        render(
            <FlagVarRenameModal
                kind="variable"
                oldId="gold"
                usageCount={4}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect(screen.getByText(/4 known usages will be updated/)).toBeTruthy();
    });

    it('rejects characters other than letters, numbers, and underscores', () => {
        const onRename = vi.fn();
        render(
            <FlagVarRenameModal
                kind="flag"
                oldId="metBartender"
                usageCount={0}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        fireEvent.change(screen.getByDisplayValue('metBartender'), {
            target: { value: 'met bartender!' },
        });
        expect(
            screen.getByText('Use letters, numbers, and underscores only.')
        ).toBeTruthy();
        const button = screen.getByText('Rename') as HTMLButtonElement;
        expect(button.disabled).toBe(true);
        fireEvent.click(button);
        expect(onRename).not.toHaveBeenCalled();
    });

    it('disables Rename when the name is unchanged', () => {
        render(
            <FlagVarRenameModal
                kind="flag"
                oldId="metBartender"
                usageCount={0}
                onRename={() => {}}
                onCancel={() => {}}
            />
        );
        expect((screen.getByText('Rename') as HTMLButtonElement).disabled).toBe(
            true
        );
    });

    it('pressing Enter with a valid name submits the rename', () => {
        const onRename = vi.fn();
        render(
            <FlagVarRenameModal
                kind="flag"
                oldId="metBartender"
                usageCount={0}
                onRename={onRename}
                onCancel={() => {}}
            />
        );
        const input = screen.getByDisplayValue('metBartender');
        fireEvent.change(input, { target: { value: 'greetedBartender' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onRename).toHaveBeenCalledExactlyOnceWith('greetedBartender');
    });

    it('clicking Cancel calls onCancel without renaming', () => {
        const onCancel = vi.fn();
        const onRename = vi.fn();
        render(
            <FlagVarRenameModal
                kind="flag"
                oldId="metBartender"
                usageCount={0}
                onRename={onRename}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onRename).not.toHaveBeenCalled();
    });
});
