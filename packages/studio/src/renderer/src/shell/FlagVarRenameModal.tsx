import { useState } from 'react';

/**
 * Rename a flag or variable key. Unlike an entity, a flag/variable has no file
 * and no declaration — it exists by being used. This rewrites every use it can
 * see (dialogue conditions/effects, the game.yaml start block), but a flag can
 * also be set by content this can't detect, so it's presented as "review these
 * usages," not a guaranteed-safe rename.
 */
export function FlagVarRenameModal({
    kind,
    oldId,
    usageCount,
    onRename,
    onCancel,
}: {
    kind: 'flag' | 'variable';
    oldId: string;
    /** How many uses the index found (all get rewritten). */
    usageCount: number;
    onRename: (newId: string) => void;
    onCancel: () => void;
}) {
    const [id, setId] = useState(oldId);

    const trimmed = id.trim();
    const badChars = trimmed !== '' && !/^[A-Za-z0-9_]+$/.test(trimmed);
    const valid = trimmed !== '' && trimmed !== oldId && !badChars;

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__title">
                    Rename {kind} “{oldId}”
                </div>

                <label className="field">
                    <span className="field__label">New name</span>
                    <input
                        className={`field__input mono ${
                            badChars ? 'dlg__input--invalid' : ''
                        }`}
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        spellCheck={false}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && valid) onRename(trimmed);
                        }}
                    />
                    {badChars && (
                        <span className="field__error">
                            Use letters, numbers, and underscores only.
                        </span>
                    )}
                </label>

                <p className="modal__message">
                    {usageCount} known usage
                    {usageCount === 1 ? '' : 's'} will be updated. A {kind} can
                    also be set by content that isn’t indexed, so review the
                    Problems panel after renaming.
                </p>

                <div className="modal__actions">
                    <button className="btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn--accent"
                        disabled={!valid}
                        onClick={() => onRename(trimmed)}
                    >
                        Rename
                    </button>
                </div>
            </div>
        </div>
    );
}
