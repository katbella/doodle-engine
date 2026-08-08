/**
 * CharacterSheet - Displays the player and current party roster.
 */

import type {
    SnapshotCharacter,
    SnapshotPlayerCharacter,
} from '@doodle-engine/core';
import { uiText } from '../uiText';

type CharacterProfile = SnapshotCharacter | SnapshotPlayerCharacter;

export interface CharacterSheetProps {
    ui?: Record<string, string>;
    character: CharacterProfile;
    characters?: CharacterProfile[];
    position: number;
    count: number;
    onSelect?: (position: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

export function CharacterSheet({
    ui,
    character,
    characters = [character],
    position,
    count,
    onSelect,
    onPrevious,
    onNext,
}: CharacterSheetProps) {
    const visibleStats = Object.entries(character.stats).filter(
        ([key]) => !key.startsWith('_')
    );

    return (
        <article className="character-sheet">
            <nav
                className="party-roster doodle-scroll"
                aria-label={uiText(ui, 'ui.party_members')}
            >
                <div className="party-roster-list">
                    {characters.map((profile, index) => (
                        <button
                            key={profile.id}
                            type="button"
                            className={`party-roster-member ${index === position ? 'is-selected' : ''}`}
                            onClick={() => onSelect?.(index)}
                            aria-pressed={index === position}
                            aria-label={
                                profile.title
                                    ? `${profile.name}, ${profile.title}`
                                    : profile.name
                            }
                        >
                            <span className="party-roster-portrait">
                                {profile.portrait ? (
                                    <img
                                        src={profile.portrait}
                                        alt=""
                                        className="party-roster-portrait-image"
                                    />
                                ) : (
                                    profile.name.charAt(0)
                                )}
                            </span>
                            <span className="party-roster-member-body">
                                <span className="party-roster-name">
                                    {profile.name}
                                </span>
                                {profile.title && (
                                    <span className="party-roster-title">
                                        {profile.title}
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="character-record doodle-scroll">
                <div className="character-dossier">
                    <header className="character-sheet-header">
                        <div className="character-sheet-portrait">
                            {character.portrait ? (
                                <img
                                    src={character.portrait}
                                    alt={character.name}
                                    className="character-sheet-portrait-image"
                                />
                            ) : (
                                <span
                                    className="character-sheet-portrait-placeholder"
                                    aria-hidden="true"
                                >
                                    portrait
                                </span>
                            )}
                        </div>
                        <div className="character-sheet-identity">
                            <h2 className="character-sheet-name">
                                {character.name}
                            </h2>
                            {character.title && (
                                <p className="character-sheet-title">
                                    {character.title}
                                </p>
                            )}
                            {character.biography && (
                                <p className="character-sheet-biography">
                                    {character.biography}
                                </p>
                            )}
                        </div>
                    </header>

                    {visibleStats.length > 0 && (
                        <div
                            className={`character-sheet-stats ${visibleStats.length > 4 ? 'is-wide' : ''}`}
                        >
                            <div className="character-sheet-stats-label">
                                Details
                            </div>
                            <dl className="character-sheet-stats-grid">
                                {visibleStats.map(([key, value]) => (
                                    <div
                                        className="character-sheet-stat"
                                        key={key}
                                    >
                                        <dt className="character-sheet-stat-label">
                                            {character.statNames[key] ?? key}
                                        </dt>
                                        <span
                                            className="character-sheet-stat-leader"
                                            aria-hidden="true"
                                        />
                                        <dd className="character-sheet-stat-value">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                </div>
            </div>

            {count > 1 && !onSelect && (
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
