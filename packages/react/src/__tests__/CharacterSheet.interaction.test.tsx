// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharacterSheet } from '../components/CharacterSheet';
import { PlayerSetup } from '../components/PlayerSetup';
import { GameContext, type GameContextValue } from '../GameProvider';
import { GameRenderer } from '../GameRenderer';
import type { Snapshot } from '@doodle-engine/core';

afterEach(cleanup);

describe('CharacterSheet', () => {
    it('shows localized visible stats and hides underscore-prefixed stats', async () => {
        const onNext = vi.fn();
        const user = userEvent.setup();
        render(
            <CharacterSheet
                character={{
                    id: 'player',
                    name: 'Avery',
                    title: 'Warden',
                    biography: 'A traveler.',
                    portrait: '',
                    profileComplete: true,
                    stats: {
                        strength: 16.2,
                        class: 'Ranger',
                        _storyScore: 4,
                    },
                    statNames: {
                        strength: 'Strength',
                        class: 'Class',
                        _storyScore: 'Story score',
                    },
                }}
                position={0}
                count={2}
                onPrevious={() => {}}
                onNext={onNext}
            />
        );

        expect(screen.getByText('Strength')).toBeTruthy();
        expect(screen.getByText('16.2')).toBeTruthy();
        expect(screen.getByText('Ranger')).toBeTruthy();
        expect(screen.queryByText('Story score')).toBeNull();
        expect(screen.queryByText('4')).toBeNull();

        await user.click(
            screen.getByRole('button', { name: 'Next character' })
        );
        expect(onNext).toHaveBeenCalledOnce();
    });
});

describe('GameRenderer party panel', () => {
    it('opens from its own bottom-bar action and cycles through party profiles', async () => {
        const user = userEvent.setup();
        const snapshot: Snapshot = {
            player: {
                id: 'player',
                name: 'Avery',
                title: 'Warden',
                biography: '',
                portrait: '',
                profileComplete: true,
                stats: {},
                statNames: {},
            },
            location: {
                id: 'camp',
                name: 'Camp',
                description: '',
                banner: '',
            },
            charactersHere: [],
            itemsHere: [],
            choices: [],
            dialogue: null,
            party: [
                {
                    id: 'elisa',
                    name: 'Elisa',
                    title: 'Scout',
                    biography: '',
                    portrait: '',
                    location: 'camp',
                    inParty: true,
                    relationship: 0,
                    stats: {},
                    statNames: {},
                },
            ],
            inventory: [],
            quests: [],
            journal: [],
            playerNotes: [],
            variables: {},
            time: { day: 1, hour: 8 },
            map: null,
            music: '',
            ambient: '',
            notifications: [],
            pendingSounds: [],
            pendingVideo: null,
            pendingInterlude: null,
            ui: {},
            currentLocale: 'en',
        };
        const actions = {
            selectChoice: vi.fn(),
            continueDialogue: vi.fn(),
            talkTo: vi.fn(),
            travelTo: vi.fn(),
            writeNote: vi.fn(),
            deleteNote: vi.fn(),
            setLocale: vi.fn(),
            saveGame: vi.fn(),
            loadGame: vi.fn(),
            dismissInterlude: vi.fn(),
            setPlayerProfile: vi.fn(),
        } as unknown as GameContextValue['actions'];

        render(
            <GameContext.Provider value={{ snapshot, actions }}>
                <GameRenderer projectId="00000000-0000-4000-8000-000000000001" />
            </GameContext.Provider>
        );

        await user.click(screen.getByRole('button', { name: 'Party' }));
        expect(screen.getByRole('heading', { name: 'Avery' })).toBeTruthy();

        await user.click(
            screen.getByRole('button', { name: 'Next character' })
        );
        expect(screen.getByRole('heading', { name: 'Elisa' })).toBeTruthy();
        expect(actions.talkTo).not.toHaveBeenCalled();
    });
});

describe('PlayerSetup', () => {
    it('requires a name and submits the entered profile without portrait input', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(
            <PlayerSetup
                ui={{
                    'ui.player_name': 'Your name',
                    'ui.player_title': 'Optional title',
                    'ui.player_biography': 'A short history',
                }}
                onSubmit={onSubmit}
            />
        );

        const submit = screen.getByRole('button', {
            name: 'Begin adventure',
        });
        expect((submit as HTMLButtonElement).disabled).toBe(true);
        expect(screen.queryByLabelText(/portrait/i)).toBeNull();
        expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
        expect(screen.getByPlaceholderText('Optional title')).toBeTruthy();
        expect(screen.getByPlaceholderText('A short history')).toBeTruthy();

        await user.type(screen.getByLabelText('Your name'), 'Avery');
        await user.type(screen.getByLabelText('Optional title'), 'Warden');
        await user.type(
            screen.getByLabelText('A short history'),
            'A traveler.'
        );
        await user.click(submit);

        expect(onSubmit).toHaveBeenCalledWith({
            name: 'Avery',
            title: 'Warden',
            biography: 'A traveler.',
        });
    });
});
