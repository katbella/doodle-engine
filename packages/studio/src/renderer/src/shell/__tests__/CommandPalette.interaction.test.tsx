// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommandPalette, type Command } from '../CommandPalette';

// jsdom does not implement scrollIntoView; the palette calls it to keep the
// highlighted option visible while navigating with the keyboard.
beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

const noop = () => {};

function makeCommands(runs: Record<string, () => void>): Command[] {
    return [
        {
            id: 'act:build',
            label: 'Build',
            group: 'Actions',
            run: runs['act:build'] ?? noop,
        },
        {
            id: 'act:validate',
            label: 'Validate',
            group: 'Actions',
            keywords: 'problems check errors',
            run: runs['act:validate'] ?? noop,
        },
        {
            id: 'file:bartender',
            label: 'bartender.yaml',
            group: 'Files',
            keywords: 'characters',
            run: runs['file:bartender'] ?? noop,
        },
    ];
}

describe('CommandPalette real interaction', () => {
    it('shows every command with no query', () => {
        render(
            <CommandPalette commands={makeCommands({})} onClose={() => {}} />
        );
        expect(screen.getByText('Build')).toBeTruthy();
        expect(screen.getByText('Validate')).toBeTruthy();
        expect(screen.getByText('bartender.yaml')).toBeTruthy();
    });

    it('typing filters to commands matching the query text', () => {
        render(
            <CommandPalette commands={makeCommands({})} onClose={() => {}} />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.change(input, { target: { value: 'valid' } });
        expect(screen.getByText('Validate')).toBeTruthy();
        expect(screen.queryByText('Build')).toBeNull();
        expect(screen.queryByText('bartender.yaml')).toBeNull();
    });

    it('matches against keywords as well as the visible label', () => {
        render(
            <CommandPalette commands={makeCommands({})} onClose={() => {}} />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.change(input, { target: { value: 'characters' } });
        expect(screen.getByText('bartender.yaml')).toBeTruthy();
        expect(screen.queryByText('Build')).toBeNull();
    });

    it('requires every space-separated term to match', () => {
        render(
            <CommandPalette commands={makeCommands({})} onClose={() => {}} />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.change(input, { target: { value: 'problems build' } });
        expect(screen.getByText('No matching commands.')).toBeTruthy();
    });

    it('clicking a command runs it and closes the palette', () => {
        const onClose = vi.fn();
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={onClose}
            />
        );
        fireEvent.click(screen.getByText('Build'));
        expect(build).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('Enter runs the first (highlighted) result', () => {
        const onClose = vi.fn();
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={onClose}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(build).toHaveBeenCalledOnce();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('ArrowDown moves the highlight to the next result, and Enter runs that one', () => {
        const onClose = vi.fn();
        const validate = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:validate': validate })}
                onClose={onClose}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(validate).toHaveBeenCalledOnce();
    });

    it('ArrowDown does not move past the last result', () => {
        const onClose = vi.fn();
        const bartender = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'file:bartender': bartender })}
                onClose={onClose}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'ArrowDown' }); // one past the end
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(bartender).toHaveBeenCalledOnce();
    });

    it('ArrowUp does not move before the first result', () => {
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={() => {}}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'ArrowUp' }); // already at 0
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(build).toHaveBeenCalledOnce();
    });

    it('changing the query resets the highlight back to the first result', () => {
        const onClose = vi.fn();
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={onClose}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'ArrowDown' }); // highlight -> Validate
        fireEvent.change(input, { target: { value: 'build' } }); // now only Build matches
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(build).toHaveBeenCalledOnce();
    });

    it('Escape closes without running anything', () => {
        const onClose = vi.fn();
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={onClose}
            />
        );
        const input = screen.getByPlaceholderText(
            'Type a command or search files…'
        );
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledOnce();
        expect(build).not.toHaveBeenCalled();
    });

    it('clicking the backdrop closes without running anything', () => {
        const onClose = vi.fn();
        const build = vi.fn();
        render(
            <CommandPalette
                commands={makeCommands({ 'act:build': build })}
                onClose={onClose}
            />
        );
        fireEvent.mouseDown(document.querySelector('.palette-backdrop')!);
        expect(onClose).toHaveBeenCalledOnce();
        expect(build).not.toHaveBeenCalled();
    });

    it('clicking inside the palette does not close it', () => {
        const onClose = vi.fn();
        render(
            <CommandPalette commands={makeCommands({})} onClose={onClose} />
        );
        fireEvent.mouseDown(screen.getByRole('dialog'));
        expect(onClose).not.toHaveBeenCalled();
    });
});
