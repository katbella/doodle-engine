/**
 * CharacterList - Displays characters at current location
 */

import type { SnapshotCharacter } from '@doodle-engine/core';
import { AssetImage } from './AssetImage';

export interface CharacterListProps {
    characters: SnapshotCharacter[];
    onTalkTo: (characterId: string) => void;
    className?: string;
}

export function CharacterList({
    characters,
    onTalkTo,
    className = '',
}: CharacterListProps) {
    if (characters.length === 0) {
        return null;
    }

    return (
        <div className={`character-list ${className}`}>
            <h2>Characters</h2>
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
