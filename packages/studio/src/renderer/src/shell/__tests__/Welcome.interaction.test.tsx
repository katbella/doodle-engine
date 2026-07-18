// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Welcome } from '../Welcome';

afterEach(cleanup);

describe('Welcome', () => {
    it('opens Studio documentation and lists recent projects in its scroll region', async () => {
        const openDocumentation = vi.fn(async () => {});
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { openDocumentation },
        });
        const user = userEvent.setup();
        const onRemoveRecent = vi.fn();

        render(
            <Welcome
                onOpen={vi.fn()}
                onNew={vi.fn()}
                onOpenRecent={vi.fn()}
                onRemoveRecent={onRemoveRecent}
                recent={[
                    {
                        name: 'The Salty Dog',
                        path: 'C:/games/salty-dog',
                        openedAt: '2026-07-15T00:00:00.000Z',
                    },
                    {
                        name: 'Market Story',
                        path: 'C:/games/market-story',
                        openedAt: '2026-07-14T00:00:00.000Z',
                    },
                ]}
                loading={false}
                error={null}
                theme="dark"
                onToggleTheme={vi.fn()}
            />
        );

        await user.click(
            screen.getByRole('button', {
                name: 'Open Doodle Studio documentation',
            })
        );

        expect(openDocumentation).toHaveBeenCalledOnce();
        expect(screen.getByText('Recent Projects')).toBeTruthy();
        expect(
            screen
                .getByRole('region', { name: 'Recent projects' })
                .classList.contains('scroll')
        ).toBe(true);
        expect(document.querySelector('.welcome__mark-image')).toBeTruthy();
        await user.click(
            screen.getByRole('button', {
                name: 'Remove The Salty Dog from recent projects',
            })
        );
        expect(onRemoveRecent).toHaveBeenCalledWith('C:/games/salty-dog');
    });
});
