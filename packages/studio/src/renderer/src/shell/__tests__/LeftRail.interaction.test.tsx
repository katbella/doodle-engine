// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RailSection } from '../../types';
import { LeftRail } from '../LeftRail';

afterEach(cleanup);

const sections: RailSection[] = [
    {
        key: 'config',
        label: 'Config',
        items: [{ id: 'game', label: 'Game', status: 'valid' }],
    },
    {
        key: 'characters',
        label: 'Characters',
        items: [
            { id: 'hero', label: 'Hero', status: 'error' },
            { id: 'sage', label: 'Sage', status: 'warn' },
        ],
    },
    { key: 'items', label: 'Items', items: [] },
];

describe('LeftRail', () => {
    it('opens, creates, renames, deletes, collapses, and expands sections', async () => {
        const callbacks = {
            open: vi.fn(),
            create: vi.fn(),
            rename: vi.fn(),
            remove: vi.fn(),
        };
        const user = userEvent.setup();
        render(
            <LeftRail
                sections={sections}
                activeKey="characters:hero"
                onOpenItem={callbacks.open}
                onNewItem={callbacks.create}
                onRenameItem={callbacks.rename}
                onDeleteItem={callbacks.remove}
            />
        );
        await user.click(screen.getByRole('button', { name: 'Hero' }));
        expect(callbacks.open).toHaveBeenCalledWith(
            'characters',
            'hero',
            'Hero'
        );
        await user.click(screen.getByRole('button', { name: 'New character' }));
        expect(callbacks.create).toHaveBeenCalledWith('characters');
        await user.click(screen.getByRole('button', { name: 'Rename Hero' }));
        expect(callbacks.rename).toHaveBeenCalledWith('characters', 'hero');
        await user.click(screen.getByRole('button', { name: 'Delete Hero' }));
        expect(callbacks.remove).toHaveBeenCalledWith(
            'characters',
            'hero',
            'Hero'
        );

        await user.click(screen.getByRole('button', { name: /Characters/ }));
        expect(screen.queryByRole('button', { name: 'Hero' })).toBeNull();
        await user.click(screen.getByRole('button', { name: /Characters/ }));
        expect(screen.getByRole('button', { name: 'Hero' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /New content/ }));
        expect(callbacks.create).toHaveBeenCalledWith('dialogues');
        expect(
            screen.queryByRole('button', { name: /New config/i })
        ).toBeNull();
    });

    it('filters case-insensitively and expands matching collapsed sections', async () => {
        const user = userEvent.setup();
        render(
            <LeftRail
                sections={sections}
                activeKey={null}
                onOpenItem={vi.fn()}
                onNewItem={vi.fn()}
                onRenameItem={vi.fn()}
                onDeleteItem={vi.fn()}
            />
        );
        const search = screen.getByPlaceholderText('Search project…');
        await user.type(search, 'saGE');
        expect(screen.getByRole('button', { name: 'Sage' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Hero' })).toBeNull();
        expect(screen.queryByRole('button', { name: /Config/ })).toBeNull();
        await user.clear(search);
        expect(screen.getByRole('button', { name: 'Hero' })).toBeTruthy();
    });
});
