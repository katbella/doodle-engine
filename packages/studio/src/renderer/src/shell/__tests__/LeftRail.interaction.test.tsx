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
            { id: 'wanderer', label: 'Wanderer', status: 'none' },
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
                onOpenOverview={vi.fn()}
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
                onOpenOverview={vi.fn()}
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

    it('opens the first keyboard search match and clears search with Escape', async () => {
        const open = vi.fn();
        const overview = vi.fn();
        const user = userEvent.setup();
        render(
            <LeftRail
                sections={sections}
                activeKey="config:game"
                onOpenOverview={overview}
                onOpenItem={open}
                onNewItem={vi.fn()}
                onRenameItem={vi.fn()}
                onDeleteItem={vi.fn()}
            />
        );

        await user.click(screen.getByRole('button', { name: 'Game config' }));
        expect(open).toHaveBeenCalledWith('config', 'game', 'Game');

        const search = screen.getByPlaceholderText('Search project…');
        await user.type(search, 'sage{Enter}');
        expect(open).toHaveBeenLastCalledWith('characters', 'sage', 'Sage');
        expect((search as HTMLInputElement).value).toBe('');

        await user.type(search, 'hero{Escape}');
        expect((search as HTMLInputElement).value).toBe('');

        await user.keyboard('{Enter}');
        expect(open).toHaveBeenCalledTimes(2);

        await user.type(search, 'hero');
        await user.click(screen.getByRole('button', { name: 'Overview' }));
        expect(overview).toHaveBeenCalledOnce();
        expect((search as HTMLInputElement).value).toBe('');
    });
});
