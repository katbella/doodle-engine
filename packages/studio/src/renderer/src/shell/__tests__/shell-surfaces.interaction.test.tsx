// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EngineBanner } from '../EngineBanner';
import { ResizeHandle } from '../ResizeHandle';
import { Welcome } from '../Welcome';

afterEach(cleanup);

describe('shell surfaces', () => {
    it('drives welcome actions, recent projects, errors, and theme choices', async () => {
        const actions = {
            open: vi.fn(),
            newProject: vi.fn(),
            recent: vi.fn(),
            theme: vi.fn(),
        };
        const user = userEvent.setup();
        const { rerender } = render(
            <Welcome
                onOpen={actions.open}
                onNew={actions.newProject}
                onOpenRecent={actions.recent}
                onRemoveRecent={vi.fn()}
                recent={[
                    {
                        name: 'Story',
                        path: 'C:/story',
                        openedAt: '2026-01-01T00:00:00.000Z',
                    },
                ]}
                loading={false}
                error="invalid project"
                theme="dark"
                onToggleTheme={actions.theme}
            />
        );
        await user.click(screen.getByRole('button', { name: 'Open project…' }));
        await user.click(screen.getByRole('button', { name: 'New project…' }));
        await user.click(
            screen.getByRole('button', {
                name: 'Open recent project Story',
            })
        );
        await user.click(
            screen.getByRole('button', { name: 'Switch to light mode' })
        );
        expect(actions.open).toHaveBeenCalledOnce();
        expect(actions.newProject).toHaveBeenCalledOnce();
        expect(actions.recent).toHaveBeenCalledWith('C:/story');
        expect(actions.theme).toHaveBeenCalledOnce();
        expect(screen.getByText(/invalid project/)).toBeTruthy();

        rerender(
            <Welcome
                onOpen={actions.open}
                onNew={actions.newProject}
                onOpenRecent={actions.recent}
                onRemoveRecent={vi.fn()}
                recent={[]}
                loading={true}
                error="hidden"
                theme="light"
                onToggleTheme={actions.theme}
            />
        );
        expect(screen.getByText('Reading project…')).toBeTruthy();
        expect(screen.queryByText(/hidden/)).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Switch to dark mode' })
        ).toBeTruthy();
    });

    it('shows dependency state and install progress', async () => {
        const onInstall = vi.fn();
        const user = userEvent.setup();
        const engine = {
            declared: 'workspace:*',
            installed: null,
            depsInstalled: false,
            packageManager: 'yarn' as const,
        };
        const { rerender, container } = render(
            <EngineBanner
                engine={engine}
                installing={false}
                onInstall={onInstall}
            />
        );
        expect(
            screen.getByText(/Install project dependencies to enable/)
        ).toBeTruthy();
        expect(screen.queryByText('yarn install')).toBeNull();
        await user.click(
            screen.getByRole('button', { name: 'Install dependencies' })
        );
        expect(onInstall).toHaveBeenCalledOnce();
        rerender(
            <EngineBanner engine={engine} installing onInstall={onInstall} />
        );
        expect(
            (
                screen.getByRole('button', {
                    name: /Installing/,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        rerender(
            <EngineBanner
                engine={{ ...engine, depsInstalled: true }}
                installing={false}
                onInstall={onInstall}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('resizes on captured pointer movement with axis, inversion, and clamps', () => {
        const onResize = vi.fn();
        const { rerender } = render(
            <ResizeHandle
                axis="x"
                size={200}
                min={100}
                max={300}
                onResize={onResize}
            />
        );
        const handle = screen.getByRole('separator') as HTMLElement;
        let captured = false;
        handle.setPointerCapture = vi.fn(() => {
            captured = true;
        });
        handle.hasPointerCapture = vi.fn(() => captured);
        handle.releasePointerCapture = vi.fn(() => {
            captured = false;
        });

        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 250 });
        expect(onResize).not.toHaveBeenCalled();
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 200 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 450 });
        expect(onResize).toHaveBeenLastCalledWith(300);
        fireEvent.pointerUp(handle, { pointerId: 1 });

        rerender(
            <ResizeHandle
                axis="y"
                size={200}
                min={100}
                max={300}
                invert
                onResize={onResize}
            />
        );
        const vertical = screen.getByRole('separator') as HTMLElement;
        captured = false;
        vertical.setPointerCapture = handle.setPointerCapture;
        vertical.hasPointerCapture = handle.hasPointerCapture;
        vertical.releasePointerCapture = handle.releasePointerCapture;
        fireEvent.pointerDown(vertical, { pointerId: 2, clientY: 200 });
        fireEvent.pointerMove(vertical, { pointerId: 2, clientY: 350 });
        expect(onResize).toHaveBeenLastCalledWith(100);
        expect(vertical.getAttribute('aria-orientation')).toBe('horizontal');
    });
});
