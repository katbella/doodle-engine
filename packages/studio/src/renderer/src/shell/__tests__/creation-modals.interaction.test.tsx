// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StudioApi } from '../../../../shared/project';
import { CreateItemModal } from '../CreateItemModal';
import { NewProjectModal } from '../NewProjectModal';

afterEach(cleanup);

describe('CreateItemModal', () => {
    it('validates identifiers, section duplicates, and Enter submission', async () => {
        const onCreate = vi.fn();
        const user = userEvent.setup();
        render(
            <CreateItemModal
                initialSection="characters"
                existingIds={(section) =>
                    section === 'characters' ? ['hero'] : ['town']
                }
                onCreate={onCreate}
                onCancel={vi.fn()}
            />
        );
        const id = screen.getByPlaceholderText('my_new_item');
        const create = screen.getByRole('button', { name: 'Create' });
        expect((create as HTMLButtonElement).disabled).toBe(true);

        await user.type(id, 'bad-id');
        expect(
            screen.getByText('Use letters, numbers, and underscores only.')
        ).toBeTruthy();
        await user.clear(id);
        await user.type(id, 'hero');
        expect(
            screen.getByText(/character with this id already exists/)
        ).toBeTruthy();

        await user.selectOptions(screen.getByRole('combobox'), 'locations');
        expect(screen.queryByText(/character with this id/)).toBeNull();
        await user.clear(id);
        await user.type(id, ' new_town ');
        fireEvent.keyDown(id, { key: 'Enter' });
        expect(onCreate).toHaveBeenCalledWith('locations', 'new_town');
    });

    it('creates from the button and cancels from both dismiss surfaces', async () => {
        const onCreate = vi.fn();
        const onCancel = vi.fn();
        const user = userEvent.setup();
        const { container } = render(
            <CreateItemModal
                initialSection="items"
                existingIds={() => []}
                onCreate={onCreate}
                onCancel={onCancel}
            />
        );
        await user.type(screen.getByPlaceholderText('my_new_item'), 'coin');
        await user.click(screen.getByRole('button', { name: 'Create' }));
        expect(onCreate).toHaveBeenCalledWith('items', 'coin');
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(container.querySelector('.modal-backdrop')!);
        expect(onCancel).toHaveBeenCalledTimes(2);
        fireEvent.click(container.querySelector('.modal')!);
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});

describe('NewProjectModal', () => {
    function installBridge(chooseDirectory: StudioApi['chooseDirectory']) {
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { chooseDirectory },
        });
    }

    it('chooses a directory and submits trimmed project options', async () => {
        installBridge(vi.fn(async () => 'C:/games'));
        const onCreate = vi.fn();
        const user = userEvent.setup();
        render(<NewProjectModal onCreate={onCreate} onCancel={vi.fn()} />);

        await user.type(screen.getByPlaceholderText('my-game'), ' Story Game ');
        await user.click(screen.getByRole('button', { name: 'Choose…' }));
        expect(screen.getByText('C:/games')).toBeTruthy();

        const checks = screen.getAllByRole('checkbox');
        await user.click(checks[0]);
        expect((checks[1] as HTMLInputElement).disabled).toBe(true);
        await user.click(screen.getByRole('button', { name: 'Create' }));
        expect(onCreate).toHaveBeenCalledWith({
            name: 'Story Game',
            targetDir: 'C:/games',
            useDefaultRenderer: false,
            useStarterStyles: true,
        });
    });

    it('stays invalid when directory selection is cancelled and dismisses', async () => {
        installBridge(vi.fn(async () => null));
        const onCancel = vi.fn();
        const user = userEvent.setup();
        const { container } = render(
            <NewProjectModal onCreate={vi.fn()} onCancel={onCancel} />
        );
        await user.type(screen.getByPlaceholderText('my-game'), 'game');
        await user.click(screen.getByRole('button', { name: 'Choose…' }));
        expect(screen.getByText('No folder chosen')).toBeTruthy();
        expect(
            (
                screen.getByRole('button', {
                    name: 'Create',
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.click(container.querySelector('.modal-backdrop')!);
        expect(onCancel).toHaveBeenCalledTimes(2);
    });
});
