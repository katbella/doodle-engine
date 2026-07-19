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

function renderBar(overrides: Record<string, unknown> = {}) {
    const props = {
        project,
        onValidate: vi.fn(),
        validating: false,
        stale: false,
        onBuild: vi.fn(),
        building: false,
        canBuild: true,
        preview: null,
        previewBusy: false,
        onStartPreview: vi.fn(),
        onStopPreview: vi.fn(),
        onOpenPreview: vi.fn(),
        onPlaytest: vi.fn(),
        onOpenPalette: vi.fn(),
        ...overrides,
    };
    render(<TopBar {...props} />);
    return props;
}

describe('TopBar', () => {
    it('holds only project actions — utilities live in the dock status area', () => {
        renderBar();
        expect(screen.getByRole('button', { name: 'Validate' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Playtest' })).toBeTruthy();
        expect(
            screen.queryByRole('button', {
                name: 'Open Doodle Studio documentation',
            })
        ).toBeNull();
        expect(
            screen.queryByRole('button', { name: /Switch to .* mode/ })
        ).toBeNull();
    });

    it('keeps Validate enabled when project dependencies are missing', async () => {
        const user = userEvent.setup();
        const { onValidate } = renderBar({ canBuild: false });

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
