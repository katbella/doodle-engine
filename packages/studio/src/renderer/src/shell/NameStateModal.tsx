/**
 * Modal for naming a saved test state. Used instead of window.prompt (a native
 * dialog, which leaves Electron's focus in a broken state). Pre-fills any
 * existing name so re-saving over it is one keystroke, and warns when the name
 * would overwrite another saved state.
 */
import { useState } from 'react';
import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

export function NameStateModal({
    existingNames,
    onSave,
    onCancel,
}: {
    existingNames: string[];
    onSave: (name: string) => void;
    onCancel: () => void;
}) {
    useModalDismiss(onCancel);
    const [name, setName] = useState('');

    const trimmed = name.trim();
    const valid = trimmed !== '';
    const overwrites = valid && existingNames.includes(trimmed);

    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal__title">Save test state</div>
                    <label className="field">
                        <span className="field__label">Name</span>
                        <input
                            className="field__input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. after odd_jobs started"
                            autoFocus
                            spellCheck={false}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && valid) onSave(trimmed);
                            }}
                        />
                        <span className="field__hint">
                            {overwrites
                                ? `Replaces the saved state “${trimmed}”.`
                                : 'Captures the whole state — flags, variables, inventory, quests, and more — to jump back to later.'}
                        </span>
                    </label>
                    <div className="modal__actions">
                        <button className="btn" onClick={onCancel}>
                            Cancel
                        </button>
                        <button
                            className="btn btn--accent"
                            disabled={!valid}
                            onClick={() => onSave(trimmed)}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </OverlayPortal>
    );
}
