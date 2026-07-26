/**
 * PlayerNotes - Displays and edits player-written notes
 */

import { useState } from 'react';
import type { PlayerNote } from '@doodle-engine/core';
import { uiText } from '../uiText';

export interface PlayerNotesProps {
    notes: PlayerNote[];
    onWrite: (title: string, text: string) => void;
    onDelete: (noteId: string) => void;
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function PlayerNotes({
    notes,
    onWrite,
    onDelete,
    ui,
    className = '',
}: PlayerNotesProps) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() && !text.trim()) return;
        onWrite(title.trim(), text.trim());
        setTitle('');
        setText('');
    };

    return (
        <div className={`player-notes ${className}`}>
            <h2>{uiText(ui, 'ui.notes')}</h2>

            <form className="player-notes-form" onSubmit={handleSubmit}>
                <input
                    className="player-notes-title-input"
                    type="text"
                    placeholder={uiText(ui, 'ui.note_title')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                    className="player-notes-text-input"
                    placeholder={uiText(ui, 'ui.note_text')}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                />
                <button className="player-notes-add-button" type="submit">
                    {uiText(ui, 'ui.add_note')}
                </button>
            </form>

            {notes.length === 0 ? (
                <p className="player-notes-empty">
                    {uiText(ui, 'ui.no_notes')}
                </p>
            ) : (
                <ul className="player-notes-list">
                    {notes.map((note) => (
                        <li key={note.id} className="player-note">
                            {note.title && (
                                <div className="player-note-title">
                                    {note.title}
                                </div>
                            )}
                            <div className="player-note-text">{note.text}</div>
                            <button
                                className="player-note-delete"
                                onClick={() => onDelete(note.id)}
                                aria-label={uiText(ui, 'ui.delete')}
                            >
                                {uiText(ui, 'ui.delete')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
