// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenProject } from '../../../../shared/project';
import { Playtest } from '../Playtest';

const project: OpenProject = {
    projectDir: 'C:/games/test',
    name: 'Test',
    version: '1.0.0',
    registry: {
        locations: {
            room: {
                id: 'room',
                name: 'Room',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {
            guide: {
                id: 'guide',
                name: 'Guide',
                biography: '',
                portrait: '',
                location: 'room',
                dialogue: 'door',
                stats: {},
            },
        },
        items: {
            key: {
                id: 'key',
                name: 'Key',
                description: '',
                icon: '',
                image: '',
                location: 'inventory',
                stats: {},
            },
        },
        maps: {},
        dialogues: {
            door: {
                id: 'door',
                startNode: 'start',
                nodes: [
                    {
                        id: 'start',
                        speaker: 'guide',
                        text: 'Welcome.',
                        choices: [
                            {
                                id: 'open',
                                text: 'Ask openly',
                                next: 'inside',
                            },
                            {
                                id: 'secret',
                                text: 'Use the secret word',
                                conditions: [
                                    { type: 'hasFlag', flag: 'knowsSecret' },
                                ],
                                next: 'inside',
                            },
                        ],
                    },
                    {
                        id: 'inside',
                        speaker: null,
                        text: 'Inside the room.',
                        choices: [],
                    },
                ],
            },
        },
        quests: {
            entry: {
                id: 'entry',
                name: 'Entry',
                description: '',
                stages: [
                    { id: 'started', description: '' },
                    { id: 'complete', description: '' },
                ],
            },
        },
        journalEntries: {},
        interludes: {},
        locales: {},
    },
    config: {
        startLocation: 'room',
        startTime: { day: 1, hour: 8 },
        startFlags: { knowsSecret: false },
        startVariables: { gold: 5 },
        startInventory: ['key'],
    },
    files: {},
    problems: [],
    engine: {
        declared: 'workspace:*',
        installed: '0.1.3',
        depsInstalled: true,
        packageManager: 'yarn',
    },
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Playtest author journeys', () => {
    it('starts at a node, explains choices, edits state, and restores a named checkpoint', async () => {
        const user = userEvent.setup();
        render(<Playtest project={project} />);

        expect(screen.getByText(/No dialogue running/)).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /Start at node/ }));
        const startNode = document.querySelector(
            '.nodepick__node'
        ) as HTMLButtonElement;
        await user.click(startNode);

        expect(screen.getByText('Welcome.')).toBeTruthy();
        expect(screen.getByText('AVAILABLE')).toBeTruthy();
        expect(screen.getByText('HIDDEN')).toBeTruthy();
        expect(
            screen.getByText(/Why hidden: REQUIRE hasFlag knowsSecret/)
        ).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Ask openly' }));
        expect(screen.getByText('Inside the room.')).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'false' }));
        expect(screen.getByRole('button', { name: 'true' })).toBeTruthy();

        const gold = screen.getByLabelText('Value of gold');
        await user.clear(gold);
        await user.type(gold, '12');
        await user.tab();
        await user.selectOptions(
            screen.getByLabelText('Stage of entry'),
            'started'
        );

        const relationship = screen.getByLabelText('Relationship with guide');
        await user.clear(relationship);
        await user.type(relationship, '3');
        await user.tab();
        await user.click(screen.getByRole('button', { name: 'remove' }));
        expect(screen.getByText('empty')).toBeTruthy();

        await user.click(
            screen.getByRole('button', { name: 'Save test state' })
        );
        await user.type(
            screen.getByPlaceholderText('e.g. after odd_jobs started'),
            'checkpoint'
        );
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(screen.getByRole('button', { name: 'checkpoint' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'true' }));
        expect(screen.getByRole('button', { name: 'false' })).toBeTruthy();
        await user.click(screen.getByRole('button', { name: 'checkpoint' }));
        expect(screen.getByRole('button', { name: 'true' })).toBeTruthy();

        await user.click(screen.getByRole('button', { name: 'Debug trace' }));
        expect(screen.getByLabelText('Search trace by id')).toBeTruthy();
    });
});
