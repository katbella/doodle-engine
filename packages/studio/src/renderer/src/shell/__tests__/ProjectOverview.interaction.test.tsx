// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import { ProjectOverview } from '../ProjectOverview';

afterEach(cleanup);

const project = {
    projectDir: 'C:/games/the-salty-dog',
    name: 'the-salty-dog',
    version: '1.0.0',
    registry: {
        dialogues: { intro: {} },
        characters: { bartender: {} },
        locations: { tavern: {}, market: {} },
        items: { coin: {} },
        quests: { odd_jobs: {} },
        maps: { town: {} },
        interludes: { opening: {} },
        journalEntries: { arrival: {} },
        locales: { en: {}, sv: {} },
    },
    config: {
        startLocation: 'tavern',
        startTime: { day: 1, hour: 8 },
        startFlags: { introduced: true },
        startVariables: { gold: 100 },
        startInventory: ['coin'],
    },
    files: {},
    problems: [],
    engine: {
        declared: '^0.2.0',
        installed: '0.2.0-rc.1',
        depsInstalled: true,
        packageManager: 'yarn',
    },
} as unknown as OpenProject;

describe('ProjectOverview', () => {
    it('summarizes project content and opens the Studio documentation', async () => {
        const openDocumentation = vi.fn(async () => {});
        Object.defineProperty(window, 'studio', {
            configurable: true,
            value: { openDocumentation },
        });
        const user = userEvent.setup();

        render(<ProjectOverview project={project} />);

        expect(
            screen.getByRole('heading', { name: 'the-salty-dog' })
        ).toBeTruthy();
        expect(screen.getByText('11 files')).toBeTruthy();
        expect(screen.getByText('No known problems')).toBeTruthy();
        expect(screen.getByText('Day 1 · 08:00')).toBeTruthy();
        expect(screen.getByText('1 flags · 1 variables')).toBeTruthy();

        await user.click(
            screen.getByRole('button', {
                name: 'Open Doodle Studio documentation',
            })
        );
        expect(openDocumentation).toHaveBeenCalledOnce();
    });

    it('formats zero and singular project file totals', () => {
        const emptyRegistry = Object.fromEntries(
            Object.keys(project.registry).map((key) => [key, {}])
        ) as unknown as OpenProject['registry'];
        const { rerender } = render(
            <ProjectOverview
                project={
                    {
                        ...project,
                        registry: emptyRegistry,
                    } as OpenProject
                }
            />
        );

        expect(screen.getByText('No files')).toBeTruthy();

        rerender(
            <ProjectOverview
                project={
                    {
                        ...project,
                        registry: {
                            ...emptyRegistry,
                            dialogues: { intro: {} },
                        },
                    } as unknown as OpenProject
                }
            />
        );

        expect(screen.getByText('1 file')).toBeTruthy();
    });
});
