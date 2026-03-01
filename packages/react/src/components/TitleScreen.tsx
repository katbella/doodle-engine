/**
 * TitleScreen - Main menu with New Game, Continue, Settings.
 *
 * Reads logo and background from shell config when available.
 * All shell assets are optional. Renders gracefully with none.
 */

import type { ShellConfig } from '@doodle-engine/core';

export interface TitleScreenProps {
    /** Resolved UI strings (from buildUIStrings or snapshot.ui) */
    ui: Record<string, string>;
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
    ui,
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
                    {ui['ui.new_game']}
                </button>
                {hasSaveData && (
                    <button className="title-button" onClick={onContinue}>
                        {ui['ui.resume']}
                    </button>
                )}
                <button className="title-button" onClick={onSettings}>
                    {ui['ui.settings']}
                </button>
            </div>
        </div>
    );
}
