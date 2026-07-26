/**
 * Names a saved test state with application-controlled focus and keyboard
 * handling. Existing names are prefilled and duplicate names show an overwrite
 * warning.
 */
import { useState } from 'react';
import { ModalShell } from './ModalShell';

export function NameStateModal({
    existingNames,
    onSave,
    onCancel,
}: {
    existingNames: string[];
    onSave: (name: string) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState('');

    const trimmed = name.trim();
    const valid = trimmed !== '';
    const overwrites = valid && existingNames.includes(trimmed);

    return (
        <ModalShell title="Save test state" onDismiss={onCancel}>
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
                        : 'Captures the whole state (flags, variables, inventory, quests, and more) to jump back to later.'}
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
        </ModalShell>
    );
}
