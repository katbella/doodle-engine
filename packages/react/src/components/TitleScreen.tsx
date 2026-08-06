/**
 * TitleScreen - Main menu with New Game, Continue, Settings.
 *
 * Reads logo and background from shell config when available.
 * All shell assets are optional. Renders gracefully with none.
 */

import type { ShellConfig } from '@doodle-engine/core';
import { screenBackgroundStyle } from './screenBackground';
import { uiText } from '../uiText';

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
    /** Open credits */
    onCredits?: () => void;
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
    onCredits,
    title = 'Doodle Engine',
    subtitle,
    className = '',
}: TitleScreenProps) {
    const displayLogo = shell?.logo;
    const background = shell?.background;
    const bgStyle = screenBackgroundStyle(background ?? '');
    const menuItems = [
        {
            label: uiText(ui, 'ui.new_game'),
            onClick: onNewGame,
            primary: true,
        },
        ...(hasSaveData
            ? [
                  {
                      label: uiText(ui, 'ui.resume'),
                      onClick: onContinue,
                      primary: false,
                  },
              ]
            : []),
        {
            label: uiText(ui, 'ui.settings'),
            onClick: onSettings,
            primary: false,
        },
        ...(onCredits
            ? [
                  {
                      label: uiText(ui, 'ui.credits'),
                      onClick: onCredits,
                      primary: false,
                  },
              ]
            : []),
    ];

    return (
        <div
            className={`title-screen ${background ? 'has-background' : ''} ${className}`}
        >
            <div className="title-backdrop" style={bgStyle} />
            {!background && (
                <div className="title-art-placeholder" aria-hidden="true">
                    <span>Title artwork</span>
                </div>
            )}
            <div className="title-vignette" aria-hidden="true" />
            <div className="title-scrim" aria-hidden="true" />

            <div className="title-content">
                {displayLogo && (
                    <img src={displayLogo} alt={title} className="title-logo" />
                )}
                {!displayLogo && (
                    <div className="title-eyebrow" aria-hidden="true">
                        <span className="title-eyebrow-rule" />
                        <span className="title-eyebrow-text">
                            Doodle Engine
                        </span>
                    </div>
                )}
                <h1 className="title-heading">{title}</h1>
                {subtitle && <p className="title-subtitle">{subtitle}</p>}
                <div className="title-menu">
                    {menuItems.map((item) => (
                        <button
                            className={`title-button ${item.primary ? 'is-primary' : ''}`}
                            key={item.label}
                            onClick={item.onClick}
                        >
                            <span className="title-button-label">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="title-build">Doodle Engine</div>
        </div>
    );
}
