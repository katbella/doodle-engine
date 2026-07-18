// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import { TopBar } from '../TopBar';

afterEach(cleanup);

const project = {
    name: 'The Salty Dog',
    problems: [],
} as unknown as OpenProject;

describe('TopBar', () => {
    it('opens Studio documentation from the help button beside the theme button', async () => {
        const openDocumentation = vi.fn(async () => {});
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { openDocumentation },
        });
        const user = userEvent.setup();

        render(
            <TopBar
                project={project}
                onValidate={vi.fn()}
                validating={false}
                stale={false}
                onBuild={vi.fn()}
                building={false}
                canBuild
                preview={null}
                previewBusy={false}
                onStartPreview={vi.fn()}
                onStopPreview={vi.fn()}
                onOpenPreview={vi.fn()}
                onPlaytest={vi.fn()}
                onOpenPalette={vi.fn()}
                theme="dark"
                onToggleTheme={vi.fn()}
            />
        );

        const help = screen.getByRole('button', {
            name: 'Open Doodle Studio documentation',
        });
        const theme = screen.getByRole('button', {
            name: 'Switch to light mode',
        });

        expect(help.nextElementSibling).toBe(theme);
        await user.click(help);
        expect(openDocumentation).toHaveBeenCalledOnce();
    });

    it('keeps Validate enabled when project dependencies are missing', async () => {
        const onValidate = vi.fn();
        const user = userEvent.setup();
        render(
            <TopBar
                project={project}
                onValidate={onValidate}
                validating={false}
                stale={false}
                onBuild={vi.fn()}
                building={false}
                canBuild={false}
                preview={null}
                previewBusy={false}
                onStartPreview={vi.fn()}
                onStopPreview={vi.fn()}
                onOpenPreview={vi.fn()}
                onPlaytest={vi.fn()}
                onOpenPalette={vi.fn()}
                theme="dark"
                onToggleTheme={vi.fn()}
            />
        );

        const validate = screen.getByRole('button', { name: 'Validate' });
        expect((validate as HTMLButtonElement).disabled).toBe(false);
        expect(
            (screen.getByRole('button', { name: 'Build' }) as HTMLButtonElement)
                .disabled
        ).toBe(true);
        await user.click(validate);
        expect(onValidate).toHaveBeenCalledOnce();
    });
});
