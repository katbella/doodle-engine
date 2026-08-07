/**
 * PlayerSetup - Collects the profile text requested by game.yaml
 */

import { useRef, useState, type SubmitEvent } from 'react';
import type { PlayerProfileInput } from '@doodle-engine/core';
import { DialogOverlay } from './DialogOverlay';
import { uiText } from '../uiText';

export interface PlayerSetupProps {
    ui?: Record<string, string>;
    onSubmit: (profile: PlayerProfileInput) => void;
    onCancel?: () => void;
}

export function PlayerSetup({ ui, onSubmit, onCancel }: PlayerSetupProps) {
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [biography, setBiography] = useState('');
    const nameRef = useRef<HTMLInputElement>(null);

    const submit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!name.trim()) return;
        onSubmit({ name, title, biography });
    };

    return (
        <DialogOverlay
            overlayClassName="player-setup-overlay"
            className="player-setup"
            ariaLabel={uiText(ui, 'ui.create_player')}
            onDismiss={() => {}}
            dismissOnBackdrop={false}
            dismissOnEscape={false}
            initialFocusRef={nameRef}
        >
            <form className="player-setup-form" onSubmit={submit}>
                <header className="player-setup-header">
                    <h2 className="player-setup-heading">
                        {uiText(ui, 'ui.create_player')}
                    </h2>
                </header>

                <label className="player-setup-field">
                    <span className="player-setup-label">
                        {uiText(ui, 'ui.player_name')}
                    </span>
                    <input
                        className="player-setup-input doodle-field"
                        ref={nameRef}
                        value={name}
                        placeholder={uiText(ui, 'ui.player_name')}
                        required
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>

                <label className="player-setup-field">
                    <span className="player-setup-label">
                        {uiText(ui, 'ui.player_title')}
                    </span>
                    <input
                        className="player-setup-input doodle-field"
                        value={title}
                        placeholder={uiText(ui, 'ui.player_title')}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </label>

                <label className="player-setup-field">
                    <span className="player-setup-label">
                        {uiText(ui, 'ui.player_biography')}
                    </span>
                    <textarea
                        className="player-setup-textarea doodle-field"
                        value={biography}
                        placeholder={uiText(ui, 'ui.player_biography')}
                        onChange={(event) => setBiography(event.target.value)}
                    />
                </label>

                <div className="player-setup-actions">
                    {onCancel && (
                        <button
                            className="player-setup-back"
                            type="button"
                            onClick={onCancel}
                        >
                            <span>{uiText(ui, 'ui.back')}</span>
                        </button>
                    )}
                    <button
                        className="player-setup-submit"
                        type="submit"
                        disabled={!name.trim()}
                    >
                        <span>{uiText(ui, 'ui.begin_adventure')}</span>
                    </button>
                </div>
            </form>
        </DialogOverlay>
    );
}
