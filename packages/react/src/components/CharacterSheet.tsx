/**
 * CharacterSheet - Displays the player or one current party member
 */

import type {
    SnapshotCharacter,
    SnapshotPlayerCharacter,
} from '@doodle-engine/core';
import { PlayerEmblem } from './PlayerEmblem';
import { uiText } from '../uiText';

export interface CharacterSheetProps {
    ui?: Record<string, string>;
    character: SnapshotCharacter | SnapshotPlayerCharacter;
    position: number;
    count: number;
    onPrevious: () => void;
    onNext: () => void;
}

export function CharacterSheet({
    ui,
    character,
    position,
    count,
    onPrevious,
    onNext,
}: CharacterSheetProps) {
    const visibleStats = Object.entries(character.stats).filter(
        ([key]) => !key.startsWith('_')
    );
    const isPlayer = character.id === 'player';

    return (
        <article className="character-sheet">
            <header className="character-sheet-header">
                <div className="character-sheet-portrait">
                    {character.portrait ? (
                        <img
                            src={character.portrait}
                            alt={character.name}
                            className="character-sheet-portrait-image"
                        />
                    ) : isPlayer ? (
                        <PlayerEmblem />
                    ) : (
                        <div
                            className="character-sheet-portrait-placeholder"
                            aria-hidden="true"
                        />
                    )}
                </div>
                <div className="character-sheet-identity">
                    <h2>{character.name}</h2>
                    {character.title && (
                        <p className="character-sheet-title">
                            {character.title}
                        </p>
                    )}
                </div>
            </header>

            {character.biography && (
                <p className="character-sheet-biography">
                    {character.biography}
                </p>
            )}

            {visibleStats.length > 0 && (
                <dl className="character-sheet-stats">
                    {visibleStats.map(([key, value]) => (
                        <div className="character-sheet-stat" key={key}>
                            <dt>{character.statNames[key] ?? key}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {count > 1 && (
                <nav
                    className="character-sheet-navigation"
                    aria-label={uiText(ui, 'ui.party_members')}
                >
                    <button type="button" onClick={onPrevious}>
                        {uiText(ui, 'ui.previous_character')}
                    </button>
                    <span aria-live="polite">
                        {position + 1} / {count}
                    </span>
                    <button type="button" onClick={onNext}>
                        {uiText(ui, 'ui.next_character')}
                    </button>
                </nav>
            )}
        </article>
    );
}
