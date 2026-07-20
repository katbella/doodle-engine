// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import { RightPanel } from '../RightPanel';

afterEach(cleanup);

describe('RightPanel validation', () => {
    it('opens and copies an item problem with its file path', async () => {
        const problem = {
            file: 'content/game.yaml',
            message: 'Choose a starting location',
            severity: 'error' as const,
        };
        const project = {
            projectDir: 'C:/story',
            registry: {},
            files: {},
            problems: [problem],
        } as unknown as OpenProject;
        const onOpenProblem = vi.fn();
        const user = userEvent.setup();
        const writeText = vi.spyOn(navigator.clipboard, 'writeText');

        render(
            <RightPanel
                project={project}
                activeTab={{
                    key: 'config:game',
                    section: 'config',
                    itemId: 'game',
                    label: 'Game config',
                }}
                referenceIndex={null}
                onOpenFile={vi.fn()}
                onOpenProblem={onOpenProblem}
            />
        );

        await user.click(
            screen.getByRole('button', { name: 'Choose a starting location' })
        );
        expect(onOpenProblem).toHaveBeenCalledWith(problem);

        const copy = screen.getByRole('button', { name: 'Copy problem' });
        expect(copy.classList.contains('problem__copy')).toBe(true);
        expect(copy.classList.contains('btn')).toBe(false);
        await user.click(copy);
        expect(writeText).toHaveBeenCalledWith(
            'content/game.yaml: Choose a starting location'
        );
        expect(
            screen.getByRole('button', { name: 'Problem copied' })
        ).toBeTruthy();
        expect(copy.classList.contains('problem__copy--copied')).toBe(true);
    });
});
