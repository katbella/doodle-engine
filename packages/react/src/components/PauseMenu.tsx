/**
 * PauseMenu - In-game overlay with Resume, Save, Load, Settings, Quit
 */

import { DialogOverlay } from './DialogOverlay';
import { uiText } from '../uiText';

export interface PauseMenuProps {
    /** Resolved UI strings from snapshot.ui */
    ui: Record<string, string>;
    /** Resume gameplay */
    onResume: () => void;
    /** Save the game */
    onSave: () => void;
    /** Load a saved game */
    onLoad: () => void;
    /** Whether a save exists to load (Load is disabled when false) */
    canLoad?: boolean;
    /** Open settings */
    onSettings: () => void;
    /** Quit to title screen */
    onQuitToTitle: () => void;
    /** CSS class */
    className?: string;
}

export function PauseMenu({
    ui,
    onResume,
    onSave,
    onLoad,
    canLoad = true,
    onSettings,
    onQuitToTitle,
    className = '',
}: PauseMenuProps) {
    const title = uiText(ui, 'ui.paused');
    return (
        <DialogOverlay
            overlayClassName={`pause-menu-overlay ${className}`}
            className="pause-menu"
            ariaLabel={title}
            onDismiss={onResume}
        >
            <h2 className="pause-title">{title}</h2>
            <div className="pause-buttons">
                <button className="pause-button is-primary" onClick={onResume}>
                    {uiText(ui, 'ui.resume')}
                </button>
                <button className="pause-button" onClick={onSave}>
                    {uiText(ui, 'ui.save')}
                </button>
                <button
                    className="pause-button"
                    onClick={onLoad}
                    disabled={!canLoad}
                >
                    {uiText(ui, 'ui.load')}
                </button>
                <button className="pause-button" onClick={onSettings}>
                    {uiText(ui, 'ui.settings')}
                </button>
                <button
                    className="pause-button pause-button-quit"
                    onClick={onQuitToTitle}
                >
                    {uiText(ui, 'ui.quit_to_title')}
                </button>
            </div>
        </DialogOverlay>
    );
}
