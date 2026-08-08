/**
 * CharacterList - Displays characters at current location
 */

import { useState, useEffect } from 'react';
import type { SnapshotCharacter } from '@doodle-engine/core';
import { uiText } from '../uiText';

const PAGE_SIZE = 3;

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
    const [page, setPage] = useState(0);
    const pageCount = Math.max(1, Math.ceil(characters.length / PAGE_SIZE));

    useEffect(() => {
        setPage(0);
    }, [characters.length]);

    const hasPrev = page > 0;
    const hasNext = page < pageCount - 1;
    const visible = characters.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <section
            className={`character-list ${className}`}
            aria-label={uiText(ui, 'ui.characters')}
        >
            <h2 className="character-list-heading doodle-visually-hidden">
                {uiText(ui, 'ui.characters')}
            </h2>
            <span
                className="character-list-icon doodle-tooltip"
                data-tip={uiText(ui, 'ui.characters')}
                title={uiText(ui, 'ui.characters')}
                aria-hidden="true"
            >
                <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4 5.5h16v9H12l-4.5 4v-4H4z" />
                </svg>
            </span>
            <div className="character-grid">
                {visible.map((character) => {
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
            {pageCount > 1 && (
                <div className="character-list-pager">
                    {hasPrev && (
                        <button
                            className="character-list-pager-button"
                            onClick={() => setPage(page - 1)}
                            title={uiText(ui, 'ui.previous_character')}
                            aria-label={uiText(ui, 'ui.previous_character')}
                        >
                            <svg viewBox="0 0 24 24" focusable="false">
                                <path d="M15 6l-6 6 6 6" />
                            </svg>
                        </button>
                    )}
                    {hasNext && (
                        <button
                            className="character-list-pager-button"
                            onClick={() => setPage(page + 1)}
                            title={uiText(ui, 'ui.next_character')}
                            aria-label={uiText(ui, 'ui.next_character')}
                        >
                            <svg viewBox="0 0 24 24" focusable="false">
                                <path d="M9 6l6 6-6 6" />
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
