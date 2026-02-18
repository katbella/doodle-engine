/**
 * useGame hook - Access game state and actions from context
 *
 * Must be used within a GameProvider
 */

import { useContext } from 'react';
import { GameContext, type GameContextValue } from '../GameProvider';

/**
 * Hook to access the current snapshot and game actions
 * @returns snapshot and actions object
 * @throws Error if used outside GameProvider
 */
export function useGame(): GameContextValue {
    const context = useContext(GameContext);

    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }

    return context;
}
