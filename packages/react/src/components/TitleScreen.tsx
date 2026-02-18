/**
 * TitleScreen - Main menu with New Game, Continue, Settings.
 *
 * Reads logo and background from shell config when available.
 * All shell assets are optional — renders gracefully with none.
 */

import type { ShellConfig } from '@doodle-engine/core';

export interface TitleScreenProps {
    /** Shell title config (from game.yaml) */
    shell?: ShellConfig['title'];
    /** Whether a save exists to continue from */
    hasSaveData: boolean;
    /** Start a new game */
    onNewGame: () => void;
    /** Continue from save */
    onContinue: () => void;
    /** Open settings */
    onSettings: () => void;
    /** Game title text (shown when no logo) */
    title?: string;
    /** Subtitle text */
    subtitle?: string;
    /** CSS class */
    className?: string;
}

export function TitleScreen({
    shell,
    hasSaveData,
    onNewGame,
    onContinue,
    onSettings,
    title = 'Doodle Engine',
    subtitle,
    className = '',
}: TitleScreenProps) {
    const displayLogo = shell?.logo;

    const bgStyle = shell?.background
        ? { backgroundImage: `url(${shell.background})` }
        : undefined;

    return (
        <div className={`title-screen ${className}`} style={bgStyle}>
            {displayLogo && (
                <img src={displayLogo} alt={title} className="title-logo" />
            )}
            <h1 className="title-heading">{title}</h1>
            {subtitle && <p className="title-subtitle">{subtitle}</p>}
            <div className="title-menu">
                <button className="title-button" onClick={onNewGame}>
                    New Game
                </button>
                {hasSaveData && (
                    <button className="title-button" onClick={onContinue}>
                        Continue
                    </button>
                )}
                <button className="title-button" onClick={onSettings}>
                    Settings
                </button>
            </div>
        </div>
    );
}
