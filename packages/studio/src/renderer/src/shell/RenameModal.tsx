import { useState } from 'react';
import { isValidIdentifier } from '@doodle-engine/core';
import type { CreatableSection } from '../lib/new-content';
import { useModalDismiss } from '../lib/useModalDismiss';
import { OverlayPortal } from './OverlayPortal';

/**
 * Modal for renaming a content item's id. Checks the new id is a valid, unique
 * identifier, then hands it back to perform the rename (which also rewrites
 * references in other files).
 */
export function RenameModal({
    section,
    oldId,
    existingIds,
    referenceCount,
    onRename,
    onCancel,
}: {
    section: CreatableSection;
    oldId: string;
    /** Ids already used in this section, to reject duplicates. */
    existingIds: string[];
    /** How many other places reference this id (all get updated). */
    referenceCount: number;
    onRename: (newId: string) => void;
    onCancel: () => void;
}) {
    useModalDismiss(onCancel);
    const [id, setId] = useState(oldId);

    const trimmed = id.trim();
    const taken = trimmed !== oldId && existingIds.includes(trimmed);
    const badChars = trimmed !== '' && !isValidIdentifier(trimmed);
    const valid = trimmed !== '' && trimmed !== oldId && !taken && !badChars;

    const error = taken
        ? `A ${section.replace(/s$/, '')} with this id already exists.`
        : badChars
          ? 'Use letters, numbers, and underscores only.'
          : null;

    return (
        <OverlayPortal>
            <div className="modal-backdrop" onClick={onCancel}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal__title">Rename “{oldId}”</div>

                    <label className="field">
                        <span className="field__label">New id</span>
                        <input
                            className={`field__input mono ${
                                error ? 'dlg__input--invalid' : ''
                            }`}
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            spellCheck={false}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && valid)
                                    onRename(trimmed);
                            }}
                        />
                        {error && <span className="field__error">{error}</span>}
                        <span className="field__hint">
                            {referenceCount > 0
                                ? `${referenceCount} reference${referenceCount === 1 ? '' : 's'} in other files will be updated.`
                                : 'Nothing else references this id.'}
                        </span>
                    </label>

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
        </OverlayPortal>
    );
}
