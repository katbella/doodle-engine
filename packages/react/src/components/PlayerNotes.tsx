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
        <div className={`player-notes-view ${className}`}>
            <section className="player-notes">
                <h2 className="doodle-section-label">
                    {uiText(ui, 'ui.new_note')}
                </h2>

                <form className="player-notes-form" onSubmit={handleSubmit}>
                    <input
                        className="player-notes-title-input doodle-field-parchment"
                        type="text"
                        placeholder={uiText(ui, 'ui.note_title')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    <textarea
                        className="player-notes-text-input doodle-field-parchment"
                        placeholder={uiText(ui, 'ui.note_text')}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={7}
                    />
                    <button className="player-notes-add-button" type="submit">
                        {uiText(ui, 'ui.add_note')}
                    </button>
                </form>

                <p className="player-notes-aside">
                    {uiText(ui, 'ui.notes_hint')}
                </p>
            </section>

            <section className="player-notes-list-column doodle-scroll doodle-scroll-parchment">
                <h2 className="doodle-section-label">
                    {uiText(ui, 'ui.your_notes')}
                </h2>
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
                                <div className="player-note-text">
                                    {note.text}
                                </div>
                                <button
                                    className="player-note-delete"
                                    type="button"
                                    onClick={() => onDelete(note.id)}
                                    aria-label={uiText(ui, 'ui.delete')}
                                >
                                    <span aria-hidden="true">×</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
