// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { Engine, createInitialState } from '@doodle-engine/core';
import type { ContentRegistry, GameConfig } from '@doodle-engine/core';
import { GameProvider } from '../GameProvider';
import { useGame } from '../hooks/useGame';

afterEach(cleanup);

function registry(): ContentRegistry {
    return {
        locations: {
            tavern: {
                id: 'tavern',
                name: 'The Tavern',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
            market: {
                id: 'market',
                name: 'The Market',
                description: '',
                banner: '',
                music: '',
                ambient: '',
            },
        },
        characters: {},
        items: {},
        maps: {},
        dialogues: {},
        quests: {},
        journalEntries: {},
        interludes: {},
        locales: {},
    };
}

const config: GameConfig = {
    title: 'Test Game',
    startLocation: 'tavern',
    startTime: { day: 1, hour: 8 },
    startFlags: {},
    startVariables: {},
    startInventory: [],
};

function GameHarness() {
    const { snapshot } = useGame();
    return (
        <>
            <div data-testid="location">{snapshot.location.name}</div>
            <div data-testid="interlude">{snapshot.pendingInterlude?.id}</div>
            <div data-testid="profile-complete">
                {String(snapshot.player.profileComplete)}
            </div>
        </>
    );
}

describe('GameProvider real player actions', () => {
    it('updates the rendered snapshot when a save is loaded', () => {
        const engine = new Engine(registry(), createInitialState());
        const snapshot = engine.newGame(config);

        let capturedActions: ReturnType<typeof useGame>['actions'] | null =
            null;
        function Capture() {
            const { actions } = useGame();
            capturedActions = actions;
            return null;
        }

        render(
            <GameProvider engine={engine} initialSnapshot={snapshot}>
                <GameHarness />
                <Capture />
            </GameProvider>
        );

        expect(screen.getByTestId('location').textContent).toBe('The Tavern');

        const save = engine.saveGame();
        save.state = { ...save.state, currentLocation: 'market' };

        act(() => {
            capturedActions!.loadGame(save);
        });

        expect(screen.getByTestId('location').textContent).toBe('The Market');
    });

    it('keeps a new-game interlude queued while the player creates a profile', () => {
        const content = registry();
        content.interludes.opening = {
            id: 'opening',
            text: 'Chapter One: The Road',
            triggerLocation: 'tavern',
        };
        const engine = new Engine(content, createInitialState());
        const snapshot = engine.newGame({
            ...config,
            playerCreatesProfile: true,
        });
        let capturedActions: ReturnType<typeof useGame>['actions'] | null =
            null;

        function Capture() {
            const { actions } = useGame();
            capturedActions = actions;
            return null;
        }

        render(
            <GameProvider engine={engine} initialSnapshot={snapshot}>
                <GameHarness />
                <Capture />
            </GameProvider>
        );

        expect(screen.getByTestId('interlude').textContent).toBe('opening');

        act(() => {
            capturedActions!.setPlayerProfile({ name: 'Wren' });
        });

        expect(screen.getByTestId('profile-complete').textContent).toBe('true');
        expect(screen.getByTestId('interlude').textContent).toBe('opening');
    });
});
