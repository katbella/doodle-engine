/**
 * CharacterList - Displays characters at current location
 */

import type { SnapshotCharacter } from '@doodle-engine/core';
import { uiText } from '../uiText';

export interface CharacterListProps {
    characters: SnapshotCharacter[];
    onTalkTo: (characterId: string) => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    /** Character currently speaking in the dialogue area. */
    activeCharacterId?: string | null;
    className?: string;
}

export function CharacterList({
    characters,
    onTalkTo,
    ui,
    activeCharacterId,
    className = '',
}: CharacterListProps) {
    return (
        <section
            className={`character-list ${className}`}
            aria-label={uiText(ui, 'ui.characters')}
        >
            <h2 className="character-list-heading doodle-visually-hidden">
                {uiText(ui, 'ui.characters')}
            </h2>
            <span
                className="character-list-icon"
                title={uiText(ui, 'ui.characters')}
                aria-hidden="true"
            >
                ◱
            </span>
            <div className="character-grid">
                {characters.map((character) => {
                    const isSpeaking = character.id === activeCharacterId;
                    return (
                        <button
                            key={character.id}
                            className={`character-card ${isSpeaking ? 'is-speaking' : ''}`}
                            onClick={() => onTalkTo(character.id)}
                            aria-pressed={isSpeaking}
                        >
                            {character.portrait ? (
                                <img
                                    src={character.portrait}
                                    alt={character.name}
                                    className="character-portrait"
                                />
                            ) : (
                                <div className="character-portrait character-portrait-placeholder" />
                            )}
                            <div className="character-card-body">
                                <div className="character-name">
                                    {character.name}
                                </div>
                                {character.title && (
                                    <div className="character-role">
                                        {character.title}
                                    </div>
                                )}
                            </div>
                            {isSpeaking && (
                                <span
                                    className="character-speaking-mark"
                                    aria-hidden="true"
                                >
                                    <svg viewBox="0 0 24 24">
                                        <path d="M4 5.5h16v9H12l-4.5 4v-4H4z" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
