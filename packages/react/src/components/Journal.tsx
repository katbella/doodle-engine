/**
 * Journal - Displays unlocked journal entries and quests
 */

import React from 'react';
import type { SnapshotQuest, SnapshotJournalEntry } from '@doodle-engine/core';

export interface JournalProps {
    quests: SnapshotQuest[];
    entries: SnapshotJournalEntry[];
    className?: string;
}

export function Journal({ quests, entries, className = '' }: JournalProps) {
    return (
        <div className={`journal ${className}`}>
            <h2>Journal</h2>

            {quests.length > 0 && (
                <div className="journal-quests">
                    <h3>Active Quests</h3>
                    {quests.map((quest) => (
                        <div key={quest.id} className="quest-entry">
                            <div className="quest-name">{quest.name}</div>
                            <div className="quest-description">
                                {quest.description}
                            </div>
                            <div className="quest-stage">
                                {quest.currentStageDescription}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {entries.length > 0 && (
                <div className="journal-entries">
                    <h3>Entries</h3>
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className={`journal-entry journal-category-${entry.category}`}
                        >
                            <div className="entry-title">{entry.title}</div>
                            <div className="entry-text">{entry.text}</div>
                        </div>
                    ))}
                </div>
            )}

            {quests.length === 0 && entries.length === 0 && (
                <p className="journal-empty">No entries yet</p>
            )}
        </div>
    );
}
