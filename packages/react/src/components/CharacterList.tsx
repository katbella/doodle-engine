/**
 * CharacterList - Displays characters at current location
 */

import type { SnapshotCharacter } from '@doodle-engine/core';
import { AssetImage } from './AssetImage';
import { uiText } from '../uiText';

export interface CharacterListProps {
    characters: SnapshotCharacter[];
    onTalkTo: (characterId: string) => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function CharacterList({
    characters,
    onTalkTo,
    ui,
    className = '',
}: CharacterListProps) {
    if (characters.length === 0) {
        return null;
    }

    return (
        <div className={`character-list ${className}`}>
            <h2>{uiText(ui, 'ui.characters')}</h2>
            <div className="character-grid">
                {characters.map((character) => (
                    <button
                        key={character.id}
                        className="character-card"
                        onClick={() => onTalkTo(character.id)}
                    >
                        {character.portrait ? (
                            <AssetImage
                                src={character.portrait}
                                alt={character.name}
                                className="character-portrait"
                            />
                        ) : (
                            <div className="character-portrait-placeholder" />
                        )}
                        <div className="character-name">{character.name}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
