/**
 * Journal - Displays unlocked journal entries and quests
 */

import type { SnapshotQuest, SnapshotJournalEntry } from '@doodle-engine/core';
import { uiText } from '../uiText';

export interface JournalProps {
    quests: SnapshotQuest[];
    entries: SnapshotJournalEntry[];
    /** Resolved UI strings from snapshot.ui; English defaults when absent. */
    ui?: Record<string, string>;
    className?: string;
}

export function Journal({ quests, entries, ui, className = '' }: JournalProps) {
    return (
        <div className={`journal ${className}`}>
            <h2 className="journal-title">{uiText(ui, 'ui.journal')}</h2>

            {quests.length > 0 && (
                <div className="journal-quests doodle-scroll doodle-scroll-parchment">
                    <h3 className="doodle-section-label">
                        {uiText(ui, 'ui.active_quests')}
                    </h3>
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
                <div className="journal-entries doodle-scroll doodle-scroll-parchment">
                    <h3 className="doodle-section-label">
                        {uiText(ui, 'ui.entries')}
                    </h3>
                    <div className="journal-entry-list">
                        {entries.map((entry) => (
                            <article
                                key={entry.id}
                                className={`journal-entry journal-category-${entry.category}`}
                            >
                                <h4 className="entry-title">{entry.title}</h4>
                                <p className="entry-text">{entry.text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            )}

            {quests.length === 0 && entries.length === 0 && (
                <p className="journal-empty">{uiText(ui, 'ui.no_entries')}</p>
            )}
        </div>
    );
}
