import { useState } from 'react';
import { CREATABLE_SECTIONS, type CreatableSection } from '../lib/new-content';
import { isValidIdentifier } from '@doodle-engine/core';

/**
 * Modal for creating a new content item. Asks for the type and an id, checks the
 * id is a valid, unique identifier, then hands the choice back to create the file.
 */
export function CreateItemModal({
    initialSection,
    existingIds,
    onCreate,
    onCancel,
}: {
    initialSection: CreatableSection;
    /** Ids already used in the chosen section, to reject duplicates. */
    existingIds: (section: CreatableSection) => string[];
    onCreate: (section: CreatableSection, id: string) => void;
    onCancel: () => void;
}) {
    const [section, setSection] = useState<CreatableSection>(initialSection);
    const [id, setId] = useState('');

    const trimmed = id.trim();
    const taken = existingIds(section).includes(trimmed);
    const badChars = trimmed !== '' && !isValidIdentifier(trimmed);
    const valid = trimmed !== '' && !taken && !badChars;

    const error = taken
        ? `A ${section.replace(/s$/, '')} with this id already exists.`
        : badChars
          ? 'Use letters, numbers, and underscores only.'
          : null;

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal__title">New content</div>

                <label className="field">
                    <span className="field__label">Type</span>
                    <select
                        className="field__input"
                        value={section}
                        onChange={(e) =>
                            setSection(e.target.value as CreatableSection)
                        }
                    >
                        {CREATABLE_SECTIONS.map((s) => (
                            <option key={s.key} value={s.key}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="field">
                    <span className="field__label">Id</span>
                    <input
                        className={`field__input mono ${
                            error ? 'dlg__input--invalid' : ''
                        }`}
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        placeholder="my_new_item"
                        spellCheck={false}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && valid)
                                onCreate(section, trimmed);
                        }}
                    />
                    {error && <span className="field__error">{error}</span>}
                </label>

                <div className="modal__actions">
                    <button className="btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        className="btn btn--accent"
                        disabled={!valid}
                        onClick={() => onCreate(section, trimmed)}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
