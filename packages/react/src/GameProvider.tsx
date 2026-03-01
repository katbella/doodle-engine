/**
 * GameProvider - React context provider for the game engine
 *
 * Holds the engine instance and current snapshot state.
 * Provides action methods that update the snapshot when called.
 */

import {
    createContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from 'react';
import { Engine, enableDevTools } from '@doodle-engine/core';
import type { Snapshot, SaveData } from '@doodle-engine/core';

export interface GameContextValue {
    snapshot: Snapshot;
    actions: {
        selectChoice: (choiceId: string) => void;
        continueDialogue: () => void;
        talkTo: (characterId: string) => void;
        takeItem: (itemId: string) => void;
        travelTo: (locationId: string) => void;
        writeNote: (title: string, text: string) => void;
        deleteNote: (noteId: string) => void;
        setLocale: (locale: string) => void;
        saveGame: () => SaveData;
        loadGame: (saveData: SaveData) => void;
        dismissInterlude: () => void;
    };
}

export const GameContext = createContext<GameContextValue | null>(null);

export interface GameProviderProps {
    /** Engine instance (already initialized with registry) */
    engine: Engine;
    /** Initial snapshot (from newGame or loadGame) */
    initialSnapshot: Snapshot;
    /** Children components */
    children: ReactNode;
    /**
     * Enable the browser console debugging API (window.doodle).
     * When true, you can type doodle.setFlag(), doodle.teleport(), etc.
     * in the browser DevTools console while testing your game.
     *
     * Pass import.meta.env.DEV to automatically enable in development
     * and disable in production builds:
     *   <GameProvider devTools={import.meta.env.DEV} ...>
     */
    devTools?: boolean;
}

/**
 * Provider component that wraps the game UI
 * Manages engine state and provides actions to child components
 */
export function GameProvider({
    engine,
    initialSnapshot,
    children,
    devTools = false,
}: GameProviderProps) {
    const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);

    useEffect(() => {
        if (devTools) {
            enableDevTools(engine, () => setSnapshot(engine.getSnapshot()));
            return () => {
                delete window.doodle;
            };
        }
    }, [engine, devTools]);

    // Action: Select a dialogue choice
    const selectChoice = useCallback(
        (choiceId: string) => {
            const newSnapshot = engine.selectChoice(choiceId);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Continue past a text-only dialogue node
    const continueDialogue = useCallback(() => {
        const newSnapshot = engine.continueDialogue();
        setSnapshot(newSnapshot);
    }, [engine]);

    // Action: Talk to a character
    const talkTo = useCallback(
        (characterId: string) => {
            const newSnapshot = engine.talkTo(characterId);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Take an item
    const takeItem = useCallback(
        (itemId: string) => {
            const newSnapshot = engine.takeItem(itemId);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Travel to a location
    const travelTo = useCallback(
        (locationId: string) => {
            const newSnapshot = engine.travelTo(locationId);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Write a player note
    const writeNote = useCallback(
        (title: string, text: string) => {
            const newSnapshot = engine.writeNote(title, text);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Delete a player note
    const deleteNote = useCallback(
        (noteId: string) => {
            const newSnapshot = engine.deleteNote(noteId);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Change language
    const setLocale = useCallback(
        (locale: string) => {
            const newSnapshot = engine.setLocale(locale);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Save game
    const saveGame = useCallback(() => {
        return engine.saveGame();
    }, [engine]);

    // Action: Load game
    const loadGame = useCallback(
        (saveData: SaveData) => {
            const newSnapshot = engine.loadGame(saveData);
            setSnapshot(newSnapshot);
        },
        [engine]
    );

    // Action: Dismiss the current interlude
    const dismissInterlude = useCallback(() => {
        setSnapshot(engine.getSnapshot());
    }, [engine]);

    const contextValue: GameContextValue = {
        snapshot,
        actions: {
            selectChoice,
            continueDialogue,
            talkTo,
            takeItem,
            travelTo,
            writeNote,
            deleteNote,
            setLocale,
            saveGame,
            loadGame,
            dismissInterlude,
        },
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
}
